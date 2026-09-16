import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import {
  verifyTenantPassword,
  newSessionToken,
  setSessionCookie,
} from '@/lib/tenant-auth';

// 租户控制台登录。
//
// 和内部后台的 /api/auth 不同：那个只比对用户名密码、把「已登录」交给前端写 cookie；
// 这里服务端建会话（tenant_sessions 一条记录 + httpOnly cookie），控制台的每个请求
// 都由服务端查会话校验。开给外部公司用，必须是真的。
//
// 登录名只在自己租户内唯一，所以按用户名可能查到多条（不同租户撞名）。
// 撞名时逐个用密码比对，命中的那个才是要登录的租户——创建用户时会拦撞名，
// 这里只是兜底，不会把两个租户混起来。

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '请提供用户名和密码' });
  }

  try {
    await db.init();
    // 顺手清掉过期会话，表不会无限涨
    await db.purgeExpiredTenantSessions();

    const candidates = await db.getTenantUsersByUsername(String(username).trim());
    if (candidates.length === 0) {
      // 不区分「用户不存在」和「密码错」——对外登录不给出可枚举的信号
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    let matched = null;
    for (const candidate of candidates) {
      if (verifyTenantPassword(String(password), candidate.password)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const tenant = await db.getTenantById(matched.tenantId);
    if (!tenant) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }
    if (!tenant.status) {
      // 租户已停用：明确告知，否则用户会一直以为是密码问题
      return res.status(403).json({ success: false, error: '该账号已停用，请联系管理员' });
    }

    const now = Date.now();
    const token = newSessionToken();
    await db.insertTenantSession({
      token,
      tenantId: matched.tenantId,
      tenantUserId: matched.id,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    });
    await db.touchTenantUserLogin(matched.id);
    setSessionCookie(res, token);

    return res.status(200).json({
      success: true,
      data: {
        tenant: { id: tenant.id, name: tenant.name },
        user: {
          id: matched.id,
          username: matched.username,
          displayName: matched.displayName,
          role: matched.role,
        },
      },
    });
  } catch (error) {
    console.error('[console/login] 出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
