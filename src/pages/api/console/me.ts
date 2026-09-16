import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { requireTenant } from '@/lib/tenant-auth';

// 当前登录者 + 所属租户。控制台每个页面进来先调它：既是取用户信息，
// 也是「会话还有效吗」的探测（失效会 401，前端据此跳回登录页）。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  try {
    const tenant = await db.getTenantById(ctx.tenantId);
    const mappingCount = tenant ? (await db.getAllProductMappings(tenant.id)).length : 0;
    const version = tenant ? await db.getProductMappingsVersion(tenant.id) : null;

    return res.status(200).json({
      success: true,
      data: {
        tenant: {
          id: ctx.tenantId,
          name: ctx.tenantName,
          status: tenant ? tenant.status : false,
          // 完整回显：控制台的主要用途就是把这个令牌拼成远程地址、复制到商家版里。
          // 它本来就是这个租户自己的凭据，给已登录的同租户成员看是正常的
          //（跟「API Key 页面」一个性质）。要作废就重置令牌。
          token: tenant ? tenant.token : '',
          tokenCreatedAt: tenant ? tenant.tokenCreatedAt : '',
        },
        user: ctx.user,
        mapping: { count: mappingCount, version },
      },
    });
  } catch (error) {
    console.error('[console/me] 出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
