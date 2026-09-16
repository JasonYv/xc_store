import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { requireTenant, hashTenantPassword } from '@/lib/tenant-auth';
import type { TenantUser } from '@/lib/types';

// 租户自己的员工账号（控制台登录）。
//
// 只有 owner 能增删改——staff 是「能编映射表但不能自己发账号」的角色。
// 三条自我保护规则（都是「把自己锁在门外」的经典坑）：
//   1. 不能停用/删除自己
//   2. 不能把租户里最后一个可用的 owner 停用或删除
//   3. 用户名全库唯一（登录时按用户名找，撞名会让另一个租户登不进来）
//
// 密码哈希在 lib/tenant-auth.ts 里（scrypt + 每用户盐），这里只负责编排。

const ROLES = ['owner', 'staff'] as const;

/** 回给前端前去掉密码哈希——它不该出现在任何响应里。 */
function sanitize(user: TenantUser): Omit<TenantUser, 'password'> {
  const { password, ...rest } = user;
  void password;
  return rest;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res, { ownerOnly: true });
  if (!ctx) return;

  try {
    if (req.method === 'GET') {
      const users = await db.getTenantUsers(ctx.tenantId);
      return res.status(200).json({
        success: true,
        data: users.map(sanitize),
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const displayName = String(body.displayName || '').trim();
      const role = ROLES.includes(body.role) ? body.role : 'staff';

      if (!username || !password || !displayName) {
        return res.status(400).json({ success: false, error: '用户名、密码、显示名都要填' });
      }
      if (username.length < 3) {
        return res.status(400).json({ success: false, error: '用户名至少 3 个字符' });
      }
      if (password.length < 8) {
        // 这是要开给外部公司的账号，比内部那套要求高一点
        return res.status(400).json({ success: false, error: '密码至少 8 位' });
      }
      if (await db.tenantUsernameExists(username)) {
        return res.status(409).json({ success: false, error: `用户名 ${username} 已被占用（登录名必须全局唯一）` });
      }

      const created = await db.insertTenantUser({
        tenantId: ctx.tenantId,
        username,
        password: hashTenantPassword(password),
        displayName,
        role,
        isActive: true,
      });
      return res.status(200).json({ success: true, data: sanitize(created) });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = String(body.id || '').trim();
      if (!id) {
        return res.status(400).json({ success: false, error: '缺少 id' });
      }

      const target = await db.getTenantUserById(id);
      if (!target || target.tenantId !== ctx.tenantId) {
        return res.status(404).json({ success: false, error: '这个账号不存在（或不属于当前租户）' });
      }

      const patch: Record<string, unknown> = {};

      if (body.username !== undefined) {
        const username = String(body.username || '').trim();
        if (username.length < 3) {
          return res.status(400).json({ success: false, error: '用户名至少 3 个字符' });
        }
        if (await db.tenantUsernameExists(username, id)) {
          return res.status(409).json({ success: false, error: `用户名 ${username} 已被占用` });
        }
        patch.username = username;
      }

      if (body.displayName !== undefined) {
        const displayName = String(body.displayName || '').trim();
        if (!displayName) {
          return res.status(400).json({ success: false, error: '显示名不能为空' });
        }
        patch.displayName = displayName;
      }

      if (body.role !== undefined) {
        if (!ROLES.includes(body.role)) {
          return res.status(400).json({ success: false, error: '角色只能是 owner 或 staff' });
        }
        patch.role = body.role;
      }

      if (body.isActive !== undefined) {
        const isActive = !!body.isActive;
        // 规则 1：不能停用自己（否则当前这个会话立刻失效，人也回不来）
        if (id === ctx.user.id && !isActive) {
          return res.status(400).json({ success: false, error: '不能停用自己的账号' });
        }
        // 规则 2：不能把最后一个 owner 停掉
        if (!isActive && target.role === 'owner') {
          const others = await db.countTenantOwners(ctx.tenantId, id);
          if (others === 0) {
            return res.status(400).json({ success: false, error: '至少要留一个可用的管理员' });
          }
        }
        patch.isActive = isActive;
      }

      if (body.password) {
        const password = String(body.password);
        if (password.length < 8) {
          return res.status(400).json({ success: false, error: '密码至少 8 位' });
        }
        patch.password = hashTenantPassword(password);
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ success: false, error: '没有需要更新的字段' });
      }

      const updated = await db.updateTenantUser(id, patch);
      // 改了密码或停用了账号 → 把该账号的会话踢掉，改动立刻生效
      if (patch.password !== undefined || patch.isActive === false) {
        await db.deleteTenantSessionsByUser(id);
      }
      return res.status(200).json({
        success: true,
        data: updated ? sanitize(updated) : null,
      });
    }

    // DELETE
    const id = String(req.query.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, error: '缺少 id' });
    }
    const target = await db.getTenantUserById(id);
    if (!target || target.tenantId !== ctx.tenantId) {
      return res.status(404).json({ success: false, error: '这个账号不存在（或不属于当前租户）' });
    }
    if (id === ctx.user.id) {
      return res.status(400).json({ success: false, error: '不能删除自己的账号' });
    }
    if (target.role === 'owner') {
      const others = await db.countTenantOwners(ctx.tenantId, id);
      if (others === 0) {
        return res.status(400).json({ success: false, error: '至少要留一个可用的管理员' });
      }
    }

    await db.deleteTenantSessionsByUser(id);
    await db.deleteTenantUser(id);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[console/users] 出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
