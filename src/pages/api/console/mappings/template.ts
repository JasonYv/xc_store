import type { NextApiRequest, NextApiResponse } from 'next';
import { requireTenant } from '@/lib/tenant-auth';
import { buildMappingTemplate } from '@/lib/mapping-xlsx';

// 下载空模板（表头 + 一行灰色示例）。
//
// 为什么值得单独做一个：导入是按表头名认列的，用户拿自己的表格来导经常因为列名
// 不认识而整列丢失。给一份标准模板，照着填就不会错。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  // 也要登录：虽然内容不含任何租户数据，但没理由让未登录的人白拿接口
  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  try {
    const buffer = await buildMappingTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mapping-template.xlsx"; filename*=UTF-8''${encodeURIComponent('商品映射表_模板.xlsx')}`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[console/mappings/template] 出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
