import type { NextApiRequest, NextApiResponse } from 'next';
import { requireTenant } from '@/lib/tenant-auth';
import { handleMappingCrud } from '@/lib/mapping-api';

// 商品映射表的增删改查（租户内）。
//
// 规则本体在 lib/mapping-api.ts（和云仓内部后台 /api/dispatch-mappings 共用）；
// 这里只负责从会话里拿 tenantId——多租户最容易出的错就是漏一个 where 导致串租户，
// 所以 tenantId 只从 ctx 来，不接受请求里传。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  return handleMappingCrud(req, res, ctx.tenantId, 'console/mappings');
}
