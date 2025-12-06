import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { da } from 'date-fns/locale';

// 定义必须存在的参数字段
const REQUIRED_FIELDS = [
  'shop_name',        // 店铺名称
  'shop_id',          // 店铺id
  'product_id',       // 商品id
  'product_name',     // 商品名称
  'product_image',    // 商品图片
  'sales_area',       // 销售区域
  'warehouse_info',   // 仓库信息
  'sales_date',       // 销售日期
  'sales_spec',       // 销售规格
  'total_stock',      // 仓库总库存
  'estimated_sales',  // 仓库预估总销售数
  'total_sales',      // 仓库总销售数
  'sales_quantity'    // 销售数(份)
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
    // console.log(`data`,data)
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

    // 验证数字字段
    const numberFields = ['total_stock', 'estimated_sales', 'total_sales', 'sales_quantity'];
    for (const field of numberFields) {
      const value = Number(data[field]);
      if (isNaN(value)) {
        return res.status(400).json({
          success: false,
          message: `字段 ${field} 必须是有效的数字`
        });
      }
    }

    // 根据店铺ID查找商家
    const shopId = String(data.shop_id);
    const productId = String(data.product_id);

    const merchant = await db.getMerchantByPinduoduoShopId(shopId);

    if (merchant) {
      // 同步商品数据：查找商家的这个商品是否存在
      const existingProduct = await db.getProductByPinduoduoIdAndShopId(productId, shopId);

      const productData = {
        pinduoduoProductId: String(data.product_id),
        pinduoduoProductImage: String(data.product_image || ''),
        productName: '', // 云仓商品名称暂时为空,需要后台手动设置
        pinduoduoProductName: String(data.product_name),
        productSpec: String(data.sales_spec),
        merchantId: merchant.id
      };

      if (existingProduct) {
        // 商品已存在,更新商品信息
        await db.updateProduct(existingProduct.id, {
          pinduoduoProductImage: productData.pinduoduoProductImage,
          pinduoduoProductName: productData.pinduoduoProductName,
          productSpec: productData.productSpec
        });
        console.log(`更新商品: productId=${productId}, merchant=${merchant.name}`);
      } else {
        // 商品不存在,新增商品
        await db.insertProduct(productData);
        console.log(`新增商品: productId=${productId}, merchant=${merchant.name}`);
      }
    } else {
      console.log(`未找到店铺ID为 ${shopId} 的商家`);
    }

    // 准备订单数据
    const orderData = {
      shopName: String(data.shop_name),
      shopId: String(data.shop_id),
      productId: String(data.product_id),
      productName: String(data.product_name),
      productImage: String(data.product_image || ''),
      salesArea: String(data.sales_area),
      warehouseInfo: String(data.warehouse_info),
      salesDate: String(data.sales_date),
      salesSpec: String(data.sales_spec),
      totalStock: Number(data.total_stock),
      estimatedSales: Number(data.estimated_sales),
      totalSales: Number(data.total_sales),
      salesQuantity: Number(data.sales_quantity)
    };

    // 检查是否已存在相同的订单（根据 shopId + productId + salesDate）
    const existingOrder = await db.getProductSalesOrderByUniqueKey(
      orderData.shopId,
      orderData.productId,
      orderData.salesDate
    );

    let order;
    let isUpdate = false;

    if (existingOrder) {
      // 如果订单已存在，更新数据
      order = await db.updateProductSalesOrder(existingOrder.id, orderData);
      isUpdate = true;
    } else {
      // 如果订单不存在，插入新订单
      order = await db.insertProductSalesOrder(orderData);
      isUpdate = false;
    }

    return res.status(200).json({
      success: true,
      message: isUpdate ? '订单数据已更新' : '订单数据已创建',
      data: {
        id: order!.id,
        createdAt: order!.createdAt,
        isUpdate
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
