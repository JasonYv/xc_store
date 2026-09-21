import type { NextApiRequest, NextApiResponse } from 'next';
import { requireTenant } from '@/lib/tenant-auth';
import { handleMappingExport } from '@/lib/mapping-api';

// 导出映射表为 xlsx，文件名里带租户名（用户同时管几家公司时不会混）。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  return handleMappingExport(req, res, ctx.tenantId, ctx.tenantName, 'console/mappings/export');
}
