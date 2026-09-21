import type { NextApiRequest, NextApiResponse } from 'next';
import { requireTenant } from '@/lib/tenant-auth';
import { handleMappingImport } from '@/lib/mapping-api';

// 从 xlsx 批量导入商品映射表（按商品码 upsert，不是整表替换），逻辑见 lib/mapping-api.ts。
// Next 只认字面量的 config（从别处 import 过来会被忽略，bodyParser 仍然开着，
// multipart 会被吃掉导致导入失败），所以每个导入路由都得原样写一份。
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  return handleMappingImport(req, res, ctx.tenantId, `租户 ${ctx.tenantName}`, 'console/mappings/import');
}
