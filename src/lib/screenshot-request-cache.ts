import { Merchant } from '@/lib/types';

// 群指令请求的内存缓存，目前两种：「机器人发图」和「生成派单表」。
// 生命周期：pending →(采集端拉取)processing →(采集端回报成功)移除。
// 兜底：processing 超 PROCESSING_TTL 退回 pending 重试；pending 超 REQUEST_TTL 作废。
// 缓存 key = kind + merchantId（不是 groupName）：一个群可能对应多个商家账号，
// 按账号去重，才能保证同群下每个账号各出一份、互不覆盖；再按 kind 分开，
// 发图和派单表是两件事，冷却与去重都不该互相牵连。
//
// 三层防刷屏（缺一不可）：
// 1) 入队冷却：同一商家 COOLDOWN_MS 内只接受一次发图请求。抵挡 WorkTool 回调重放/
//    重启积压/用户连发导致的洪水式重复触发（这是最外层、最关键的一层）。
// 2) 下发上限：单条请求最多被下发 MAX_CLAIM_ATTEMPTS 次，回报持续失败也不会无限重发。
// 3) TTL 兜底：processing/pending 超时的清理，避免请求卡死或长期堆积。

export type RequestStatus = 'pending' | 'processing';
export type EnqueueResult = 'enqueued' | 'refreshed' | 'cooldown';
// screenshot=汇总表截图，发回触发指令的群；dispatch=派单表，固定发到采集端配置的通知群
export type RequestKind = 'screenshot' | 'dispatch';

export const DEFAULT_KIND: RequestKind = 'screenshot';

export interface ScreenshotRequest {
  merchantId: string;   // merchant.id（采集端 account_data.api_id）
  merchantName: string; // merchant.name
  groupName: string;    // merchant.groupName（触发指令的群；截图回发到这里）
  kind: RequestKind;    // 指令类型（与 merchantId 共同构成缓存 key）
  status: RequestStatus;
  requestedAt: number;  // 首次入队时间戳(ms)
  updatedAt: number;    // 最近更新时间戳(ms)
  attempts: number;     // 已被采集端领取(下发)的次数，用于封顶防止无限重发
}

const PROCESSING_TTL = 5 * 60 * 1000;   // processing 超 5min 退回 pending
const REQUEST_TTL = 10 * 60 * 1000;     // pending 超 10min 作废
const MAX_CLAIM_ATTEMPTS = 2;           // 单条请求最多下发次数
const COOLDOWN_MS = 3 * 60 * 1000;      // 同一商家两次发图请求的最小间隔（冷却窗口）

// 挂在 globalThis 上，避免 Next.js dev 热重载丢失；生产单进程 fork 天然单例。
const globalForCache = globalThis as unknown as {
  __screenshotRequestCache__?: Map<string, ScreenshotRequest>;
  __screenshotLastServed__?: Map<string, number>; // merchantId -> 最近一次派发(领取)截图的时间戳
};

function store(): Map<string, ScreenshotRequest> {
  if (!globalForCache.__screenshotRequestCache__) {
    globalForCache.__screenshotRequestCache__ = new Map<string, ScreenshotRequest>();
  }
  return globalForCache.__screenshotRequestCache__;
}

// cacheKey -> 最近一次真正派发的时间戳（用于冷却判断；请求删除后仍保留一段时间）
function lastServedStore(): Map<string, number> {
  if (!globalForCache.__screenshotLastServed__) {
    globalForCache.__screenshotLastServed__ = new Map<string, number>();
  }
  return globalForCache.__screenshotLastServed__;
}

// 缓存 key：同一商家的发图与派单表是两条独立请求，不能互相顶掉
function cacheKey(merchantId: string, kind: RequestKind): string {
  return `${kind}:${merchantId}`;
}

// 每次读写前调用：处理 TTL 兜底 + 清理过期的冷却记录。
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

  // 清理过期冷却记录，避免无限增长
  const served = lastServedStore();
  const staleServed: string[] = [];
  served.forEach((ts, key) => {
    if (now - ts > COOLDOWN_MS) staleServed.push(key);
  });
  staleServed.forEach((key) => served.delete(key));
}

// 入队（按 merchantId + kind）。返回：
// - 'refreshed'：该商家同类请求已在途(pending/processing) → 只刷新 updatedAt，不新增。
// - 'cooldown' ：距上次派发同类请求不足 COOLDOWN_MS → 忽略本次（防重复触发刷屏）。
// - 'enqueued' ：新建了一条待处理请求。
export function enqueue(merchant: Merchant, kind: RequestKind = DEFAULT_KIND): EnqueueResult {
  const now = Date.now();
  sweep(now);
  const map = store();
  const key = cacheKey(merchant.id, kind);

  const existing = map.get(key);
  if (existing) {
    existing.updatedAt = now;
    return 'refreshed';
  }

  const lastServedAt = lastServedStore().get(key);
  if (lastServedAt !== undefined && now - lastServedAt < COOLDOWN_MS) {
    return 'cooldown';
  }

  map.set(key, {
    merchantId: merchant.id,
    merchantName: merchant.name,
    groupName: merchant.groupName,
    kind,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
    attempts: 0,
  });
  return 'enqueued';
}

// 取所有 pending，标记 processing 后返回（采集端拉取）。
export function claimPending(): ScreenshotRequest[] {
  const now = Date.now();
  sweep(now);
  const map = store();
  const served = lastServedStore();
  const claimed: ScreenshotRequest[] = [];
  const toDelete: string[] = [];
  map.forEach((req, key) => {
    if (req.status === 'pending') {
      // 已达下发上限（回报一直没成功）→ 丢弃，不再下发，防止无限重发刷屏
      if (req.attempts >= MAX_CLAIM_ATTEMPTS) {
        toDelete.push(key);
        console.warn(
          `[screenshot-cache] 请求已达下发上限(${MAX_CLAIM_ATTEMPTS})，丢弃：${req.kind} / ${req.merchantName} / ${req.groupName}（回报可能一直失败，检查采集端与服务端版本是否匹配）`
        );
        return;
      }
      req.status = 'processing';
      req.attempts += 1;
      req.updatedAt = now;
      served.set(key, now); // 记录派发时间，用于后续冷却
      claimed.push({ ...req });
    }
  });
  toDelete.forEach((key) => map.delete(key));
  return claimed;
}

// 采集端回报发送成功，按 merchantId + kind 移除该条。返回是否命中。
// kind 缺省为 screenshot：老采集端不带 kind，它只会处理发图请求。
export function complete(merchantId: string, kind: RequestKind = DEFAULT_KIND): boolean {
  sweep(Date.now());
  return store().delete(cacheKey(merchantId, kind));
}

// 向后兼容：旧采集端按 groupName 回报时，移除该群下所有发图请求（一个群可能多个账号）。
// 只清 screenshot：老采集端不认识派单表请求，不能让它的回报把派单表请求一起抹掉。
// 返回移除条数。
export function completeByGroup(groupName: string): number {
  sweep(Date.now());
  const map = store();
  const toDelete: string[] = [];
  map.forEach((req, key) => {
    if (req.groupName === groupName && req.kind === 'screenshot') toDelete.push(key);
  });
  toDelete.forEach((key) => map.delete(key));
  return toDelete.length;
}
