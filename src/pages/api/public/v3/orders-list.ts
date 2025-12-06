import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 仅允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '仅支持 GET 请求'
    });
  }

  try {
    // 初始化数据库
    await db.init();
    await db.migrateFromJson();

    // 获取日期参数
    const { date } = req.query;

    // 验证日期参数是否存在
    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: date (格式: YYYY-MM-DD)'
      });
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: '日期格式错误，请使用 YYYY-MM-DD 格式'
      });
    }

    // 根据日期查询订单列表(关联商家表)
    const orders = await db.getProductSalesOrdersByDate(date);

    // 简化返回数据,只返回核心字段(包含商家名称)
    const simplifiedOrders = orders.map(order => ({
      merchantName: order.merchantName,    // 商家名称(关联查询)
      shopName: order.shopName,            // 店铺名称
      productName: order.productName,      // 商品名称
      salesArea: order.salesArea,          // 销售区域
      warehouseInfo: order.warehouseInfo,  // 仓库信息
      salesSpec: order.salesSpec,          // 销售规格
      totalStock: order.totalStock,        // 总库存
      estimatedSales: order.estimatedSales,// 预估销售
      totalSales: order.totalSales,        // 总销售
      salesQuantity: order.salesQuantity   // 销售数量
    }));

    return res.status(200).json({
      success: true,
      data: simplifiedOrders
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
