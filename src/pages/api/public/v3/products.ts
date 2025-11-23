import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

// 定义必须存在的参数字段
const REQUIRED_FIELDS = [
  'pinduoduo_product_id',      // 多多买菜商品ID
  'pinduoduo_product_image',   // 商品图片
  'pinduoduo_product_name',    // 多多买菜商品名称
  'product_spec',              // 商品规格
  'pinduoduo_shop_id'          // 多多买菜店铺ID（用于关联商家）
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '仅支持 POST 请求'
    });
  }

  try {
    // 初始化数据库
    await db.init();
    await db.migrateFromJson();

    const data = req.body;

    // 验证所有必需字段是否存在
    const missingFields: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `缺少必需的参数字段: ${missingFields.join(', ')}`
      });
    }

    // 根据多多买菜店铺ID查找商家
    const pinduoduoShopId = String(data.pinduoduo_shop_id);
    const merchant = await db.getMerchantByPinduoduoShopId(pinduoduoShopId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: `未找到店铺ID为 ${pinduoduoShopId} 的商家，请先确保该商家已存在并已关联店铺ID`
      });
    }

    // 插入商品数据到数据库
    const product = await db.insertProduct({
      pinduoduoProductId: String(data.pinduoduo_product_id),
      pinduoduoProductImage: String(data.pinduoduo_product_image),
      productName: String(data.pinduoduo_product_name), // 使用多多买菜商品名称作为商品名称
      pinduoduoProductName: String(data.pinduoduo_product_name),
      productSpec: String(data.product_spec),
      merchantId: merchant.id  // 使用查找到的商家ID
    });

    return res.status(200).json({
      success: true,
      message: '商品数据保存成功',
      data: {
        id: product.id,
        createdAt: product.createdAt,
        merchantId: merchant.id,
        merchantName: merchant.name,
        pinduoduoShopId: merchant.pinduoduoShopId
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
