import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { requireTenant } from '@/lib/tenant-auth';
import { buildMappingWorkbook } from '@/lib/mapping-xlsx';

// 导出映射表为 xlsx（备份、交付、或者给别的系统用）。
//
// 导出的表头用的是标准列名，且这些名字都在导入的别名表里，所以「导出 → 改 → 再导入」
// 能原样往返，不会因为列名认不出而丢列。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  try {
    const rows = await db.getAllProductMappings(ctx.tenantId);
    const buffer = await buildMappingWorkbook(rows);

    // 文件名里带租户名，用户同时管几家公司时不会混
    const safeName = ctx.tenantName.replace(/[\\/:*?"<>|]/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${safeName}_商品映射表_${date}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mapping.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[console/mappings/export] 出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
