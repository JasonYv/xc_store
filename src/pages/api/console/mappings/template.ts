import type { NextApiRequest, NextApiResponse } from 'next';
import { requireTenant } from '@/lib/tenant-auth';
import { handleMappingTemplate } from '@/lib/mapping-api';

// 下载空模板（表头 + 一行灰色示例）。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  // 也要登录：虽然内容不含任何租户数据，但没理由让未登录的人白拿接口
  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  return handleMappingTemplate(req, res, 'console/mappings/template');
}
