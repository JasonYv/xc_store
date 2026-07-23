import { Merchant } from '@/lib/types';

// 「机器人发图」请求的内存缓存。
// 生命周期：pending →(采集端拉取)processing →(采集端回报成功)移除。
// 兜底：processing 超 PROCESSING_TTL 退回 pending 重试；pending 超 REQUEST_TTL 作废。

export type RequestStatus = 'pending' | 'processing';

export interface ScreenshotRequest {
  merchantId: string;   // merchant.id（采集端 account_data.api_id）
  merchantName: string; // merchant.name
  groupName: string;    // merchant.groupName（缓存 key）
  status: RequestStatus;
  requestedAt: number;  // 首次入队时间戳(ms)
  updatedAt: number;    // 最近更新时间戳(ms)
}

const PROCESSING_TTL = 5 * 60 * 1000;  // processing 超 5min 退回 pending
const REQUEST_TTL = 10 * 60 * 1000;    // pending 超 10min 作废

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
  map.forEach((req, groupName) => {
    if (req.status === 'processing' && now - req.updatedAt > PROCESSING_TTL) {
      req.status = 'pending';
      req.updatedAt = now;
    } else if (req.status === 'pending' && now - req.requestedAt > REQUEST_TTL) {
      toDelete.push(groupName);
    }
  });
  toDelete.forEach((groupName) => map.delete(groupName));
}

// 入队。同群已存在(pending/processing)时只刷新 updatedAt（合并去重）。
export function enqueue(merchant: Merchant): void {
  const now = Date.now();
  sweep(now);
  const map = store();
  const existing = map.get(merchant.groupName);
  if (existing) {
    existing.updatedAt = now;
    return;
  }
  map.set(merchant.groupName, {
    merchantId: merchant.id,
    merchantName: merchant.name,
    groupName: merchant.groupName,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
  });
}

// 取所有 pending，标记 processing 后返回（采集端拉取）。
export function claimPending(): ScreenshotRequest[] {
  const now = Date.now();
  sweep(now);
  const map = store();
  const claimed: ScreenshotRequest[] = [];
  map.forEach((req) => {
    if (req.status === 'pending') {
      req.status = 'processing';
      req.updatedAt = now;
      claimed.push({ ...req });
    }
  });
  return claimed;
}

// 采集端回报发送成功，移除该条。返回是否命中。
export function complete(groupName: string): boolean {
  sweep(Date.now());
  return store().delete(groupName);
}
