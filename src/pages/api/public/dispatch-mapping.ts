import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { CLOUD_MAPPING_TENANT_ID, MAPPING_COLUMNS, toMappingRow } from '@/lib/mapping-api';

// 云仓版桌面端拉派单表商品映射表。
//
//   GET /api/public/dispatch-mapping      （header: x-api-key）
//
// 凭据与 /api/public/merchants/list 相同（系统设置里的 apiKey），桌面端用的就是
// GUI 里已经填好的「API地址 + API密钥」，不用再配新东西。
//
// 响应形状刻意与 /api/ys/{token} 一致（data.mapping.rows），桌面端解析逻辑同一套。
// version = 映射表最后修改时间；0 行时为 null（后台还没导入，桌面端会回落本地文件）。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  try {
    await db.init();
    await db.migrateFromJson();

    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const systemApiKey = await db.getSetting('apiKey');
    if (!apiKey || !systemApiKey || apiKey !== systemApiKey) {
      return res.status(401).json({ success: false, error: 'API Key 无效' });
    }

    const rows = await db.getAllProductMappings(CLOUD_MAPPING_TENANT_ID);
    const version = await db.getProductMappingsVersion(CLOUD_MAPPING_TENANT_ID);

    return res.status(200).json({
      success: true,
      data: {
        version,
        mapping: {
          columns: MAPPING_COLUMNS,
          rows: rows.map(toMappingRow),
        },
      },
    });
  } catch (error) {
    console.error('[public/dispatch-mapping] 拉取映射表出错:', error);
    return res.status(500).json({ success: false, error: '服务器内部错误' });
  }
}
