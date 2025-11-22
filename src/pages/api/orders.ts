import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  await db.migrateFromJson();

  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        pageSize = '10',
        shopName,
        productName,
        salesArea,
        salesDate,
        orderBy = 'createdAt',
        orderDirection = 'DESC'
      } = req.query;

      const filters: any = {};
      if (shopName) filters.shopName = shopName as string;
      if (productName) filters.productName = productName as string;
      if (salesArea) filters.salesArea = salesArea as string;
      if (salesDate) filters.salesDate = salesDate as string;

      const result = await db.getProductSalesOrdersPaginated(
        parseInt(page as string),
        parseInt(pageSize as string),
        Object.keys(filters).length > 0 ? filters : undefined,
        orderBy as string,
        orderDirection as 'ASC' | 'DESC'
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('获取订单列表失败:', error);
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
