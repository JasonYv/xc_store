import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  await db.migrateFromJson();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const order = await db.getProductSalesOrderById(id as string);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      return res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('获取订单详情失败:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '服务器内部错误'
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: '不支持的请求方法'
  });
}
