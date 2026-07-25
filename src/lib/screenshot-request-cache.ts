import { Merchant } from '@/lib/types';

// 「机器人发图」请求的内存缓存。
// 生命周期：pending →(采集端拉取)processing →(采集端回报成功)移除。
// 兜底：processing 超 PROCESSING_TTL 退回 pending 重试；pending 超 REQUEST_TTL 作废。
// 缓存 key = merchantId（不是 groupName）：一个群可能对应多个商家账号，
// 按账号去重，才能保证同群下每个账号各截一张图、互不覆盖。

export type RequestStatus = 'pending' | 'processing';

export interface ScreenshotRequest {
  merchantId: string;   // merchant.id（采集端 account_data.api_id）（缓存 key）
  merchantName: string; // merchant.name
  groupName: string;    // merchant.groupName（截图发送目标群）
  status: RequestStatus;
  requestedAt: number;  // 首次入队时间戳(ms)
  updatedAt: number;    // 最近更新时间戳(ms)
  attempts: number;     // 已被采集端领取(下发)的次数，用于封顶防止无限重发
}

const PROCESSING_TTL = 5 * 60 * 1000;  // processing 超 5min 退回 pending
const REQUEST_TTL = 10 * 60 * 1000;    // pending 超 10min 作废
// 单条请求最多被下发的次数。正常一次即完成；若回报一直失败（如契约不匹配/网络），
// 达到上限后直接丢弃，避免「回报失败→TTL 退回→再截图」的无限循环刷屏群。
const MAX_CLAIM_ATTEMPTS = 2;

// 挂在 globalThis 上，避免 Next.js dev 热重载丢失；生产单进程 fork 天然单例。
const globalForCache = globalThis as unknown as {
  __screenshotRequestCache__?: Map<string, ScreenshotRequest>;
};

function store(): Map<string, ScreenshotRequest> {
  if (!globalForCache.__screenshotRequestCache__) {
    globalForCache.__screenshotRequestCache__ = new Map<string, ScreenshotRequest>();
  }
  return globalForCache.__screenshotRequestCache__;
}

// 每次读写前调用：处理 TTL 兜底。
function sweep(now: number): void {
  const map = store();
  const toDelete: string[] = [];
  map.forEach((req, key) => {
    if (req.status === 'processing' && now - req.updatedAt > PROCESSING_TTL) {
      req.status = 'pending';
      req.updatedAt = now;
    } else if (req.status === 'pending' && now - req.requestedAt > REQUEST_TTL) {
      toDelete.push(key);
    }
  });
  toDelete.forEach((key) => map.delete(key));
}

// 入队（按 merchantId）。同账号已存在(pending/processing)时只刷新 updatedAt（合并去重）。
export function enqueue(merchant: Merchant): void {
  const now = Date.now();
  sweep(now);
  const map = store();
  const existing = map.get(merchant.id);
  if (existing) {
    existing.updatedAt = now;
    return;
  }
  map.set(merchant.id, {
    merchantId: merchant.id,
    merchantName: merchant.name,
    groupName: merchant.groupName,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
    attempts: 0,
  });
}

// 取所有 pending，标记 processing 后返回（采集端拉取）。
export function claimPending(): ScreenshotRequest[] {
  const now = Date.now();
  sweep(now);
  const map = store();
  const claimed: ScreenshotRequest[] = [];
  const toDelete: string[] = [];
  map.forEach((req, key) => {
    if (req.status === 'pending') {
      // 已达下发上限（回报一直没成功）→ 丢弃，不再下发，防止无限重发刷屏
      if (req.attempts >= MAX_CLAIM_ATTEMPTS) {
        toDelete.push(key);
        console.warn(
          `[screenshot-cache] 请求已达下发上限(${MAX_CLAIM_ATTEMPTS})，丢弃：${req.merchantName} / ${req.groupName}（回报可能一直失败，检查采集端与服务端版本是否匹配）`
        );
        return;
      }
      req.status = 'processing';
      req.attempts += 1;
      req.updatedAt = now;
      claimed.push({ ...req });
    }
  });
  toDelete.forEach((key) => map.delete(key));
  return claimed;
}

// 采集端回报发送成功，按 merchantId 移除该条。返回是否命中。
export function complete(merchantId: string): boolean {
  sweep(Date.now());
  return store().delete(merchantId);
}
