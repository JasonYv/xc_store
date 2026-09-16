import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

// 租户控制台（/console）的鉴权。
//
// 为什么不复用现有的那套：现有后台的「登录」是个前端 cookie（`isAuthenticated=true`），
// 服务端从不校验——浏览器里手写一行 document.cookie 就能进；内部 /api/* 也完全不查。
// 那套只适合内网自用。租户控制台要开给别的公司，所以这里从零做一套真的：
// 服务端会话（会话表里存随机 token，cookie 只是它的载体）+ scrypt 加盐哈希。
//
// 会话存 SQLite 而不是进程内存：pm2 重启后租户不用重新登录，也让「同一份数据
// 两个域名」的情况下行为一致（部署是 instances: 1，本来就没有多进程共享问题）。

/** 会话有效期：30 天。到期前每次访问自动续期（滑动过期）。 */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 会话 cookie 名。和内部后台的 `isAuthenticated` 刻意区分开，避免互相污染。 */
export const TENANT_SESSION_COOKIE = 'tenantSession';
/** scrypt 参数：Node 默认值（N=16384, r=8, p=1），够用且不拖慢登录。 */
const SCRYPT_KEYLEN = 64;

export interface TenantUser {
  id: string;
  tenantId: string;
  username: string;
  displayName: string;
  role: 'owner' | 'staff';
  isActive: boolean;
}

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  user: TenantUser;
}

// ==================== 口令哈希 ====================
// 格式：scrypt$<saltHex>$<hashHex>。自带算法与盐，将来换算法也能按前缀识别旧值。

export function hashTenantPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyTenantPassword(password: string, stored: string): boolean {
  try {
    const [algo, saltHex, hashHex] = String(stored || '').split('$');
    if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    // 定长比较，避免按字节提前返回泄露信息
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ==================== 会话 ====================
// token 是 32 字节随机数的十六进制串。控制台每个请求带它，服务端查库校验。

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** 租户的远程配置令牌（桌面端填在 GUI 里的那个）。 */
export function newTenantToken(): string {
  // 带前缀纯粹为了肉眼可辨识：日志/截图里一眼能看出这是租户令牌而不是别的东西
  return `ys_${crypto.randomBytes(24).toString('hex')}`;
}

/** 解析请求里的会话 cookie（不含校验）。 */
export function readSessionCookie(req: NextApiRequest): string {
  const raw = req.cookies?.[TENANT_SESSION_COOKIE] || '';
  return String(raw).trim();
}

/** 把会话 cookie 写进响应。httpOnly + sameSite=lax，30 天。 */
export function setSessionCookie(res: NextApiResponse, token: string): void {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${TENANT_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
}

export function clearSessionCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${TENANT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

/**
 * 校验会话并返回租户上下文；失败返回 null。
 *
 * 校验三件事：会话存在且未过期、租户仍在启用状态、租户用户仍启用。
 * 任何一条不满足都当作未登录——停用租户要能立刻生效，不能等 30 天。
 */
export async function resolveTenantSession(req: NextApiRequest): Promise<TenantContext | null> {
  const token = readSessionCookie(req);
  if (!token) return null;

  try {
    await db.init();
    const session = await db.getTenantSession(token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await db.deleteTenantSession(token);
      return null;
    }

    const tenant = await db.getTenantById(session.tenantId);
    if (!tenant || !tenant.status) return null;

    const user = await db.getTenantUserById(session.tenantUserId);
    if (!user || !user.isActive) return null;

    // 滑动续期：只在过期日临近时才写库，避免每个请求都产生一次写
    const expiresAt = new Date(session.expiresAt).getTime();
    if (expiresAt - Date.now() < SESSION_TTL_MS / 2) {
      await db.touchTenantSession(token, new Date(Date.now() + SESSION_TTL_MS).toISOString());
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        displayName: user.displayName,
        role: (user.role === 'owner' ? 'owner' : 'staff') as 'owner' | 'staff',
        isActive: !!user.isActive,
      },
    };
  } catch (error) {
    console.error('[tenant-auth] 校验会话出错:', error);
    return null;
  }
}

/**
 * 控制台接口的统一入口守卫。
 *
 * 用法（在每个 /api/console/* 的 handler 开头）：
 *   const ctx = await requireTenant(req, res);
 *   if (!ctx) return;                       // 已经写好 401
 *
 * ownerOnly=true 时，非 owner 会被 403 挡掉（员工的增删改只给 owner）。
 */
export async function requireTenant(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { ownerOnly?: boolean } = {}
): Promise<TenantContext | null> {
  const ctx = await resolveTenantSession(req);
  if (!ctx) {
    res.status(401).json({ success: false, error: '未登录或会话已过期' });
    return null;
  }
  if (options.ownerOnly && ctx.user.role !== 'owner') {
    res.status(403).json({ success: false, error: '只有租户管理员可以做这个操作' });
    return null;
  }
  return ctx;
}
