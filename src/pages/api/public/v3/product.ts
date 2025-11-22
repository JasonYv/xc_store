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

    const { pinduoduo_product_id, pinduoduo_shop_id } = req.query;

    // 验证必需参数
    if (!pinduoduo_product_id || !pinduoduo_shop_id) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: pinduoduo_product_id 和 pinduoduo_shop_id'
      });
    }

    // 根据多多买菜商品ID和店铺ID查询商品
    const product = await db.getProductByPinduoduoIdAndShopId(
      String(pinduoduo_product_id),
      String(pinduoduo_shop_id)
    );

    if (!product) {
      return res.status(200).json({
        success: true,
        message: '未找到对应的商品信息',
        data: null
      });
    }

    // 获取关联的商家信息
    const merchant = await db.getMerchantById(product.merchantId);

    // 返回商品信息
    return res.status(200).json({
      success: true,
      message: '查询成功',
      data: {
        id: product.id,
        createdAt: product.createdAt,
        pinduoduoProductId: product.pinduoduoProductId,
        pinduoduoProductImage: product.pinduoduoProductImage,
        productName: product.productName,
        pinduoduoProductName: product.pinduoduoProductName,
        productSpec: product.productSpec,
        merchantId: product.merchantId,
        merchantName: merchant?.name || ''
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
