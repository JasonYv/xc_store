import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

//   GET /api/ys/{token}/mapping
//
// 只要映射表本身（不要 tenant 元信息）。和 /api/ys/{token} 返回的是同一份数据，
// 拆出来是为了将来这个令牌下还要挂别的东西（比如派单模板）时，桌面端能各取各的，
// 不用每次都把整包拽下来。

const TOKEN_PATTERN = /^ys_[0-9a-f]{48}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  // 这个路由的 query.token 由 [token] 目录段提供
  const token = String(req.query.token || '').trim();
  if (!token || !TOKEN_PATTERN.test(token)) {
    return res.status(404).json({ success: false, error: 'not found' });
  }

  try {
    await db.init();

    const tenant = await db.getTenantByToken(token);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'not found' });
    }
    if (!tenant.status) {
      return res.status(403).json({ success: false, error: '该租户已停用，请联系服务方' });
    }

    const rows = await db.getAllProductMappings(tenant.id);
    const version = await db.getProductMappingsVersion(tenant.id);

    return res.status(200).json({
      success: true,
      data: {
        version,
        rows: rows.map(row => ({
          productId: row.productId,
          pddName: row.pddName,
          dispatchName: row.dispatchName,
          spec: row.spec,
          listCode: row.listCode,
          boxSpec: row.boxSpec,
          category: row.category,
        })),
      },
    });
  } catch (error) {
    console.error('[ys/mapping] 拉取映射表出错:', error);
    return res.status(500).json({ success: false, error: '服务器内部错误' });
  }
}
