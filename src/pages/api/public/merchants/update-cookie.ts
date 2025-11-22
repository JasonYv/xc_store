import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { CONFIG } from '@/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  await db.migrateFromJson();

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: '仅支持 POST/PUT 请求'
    });
  }

  // 验证API Key
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== CONFIG.api.key) {
    return res.status(401).json({
      success: false,
      message: 'API Key 无效'
    });
  }

  const { merchantId, cookie } = req.body;

  // 验证必需参数
  if (!merchantId) {
    return res.status(400).json({
      success: false,
      message: '缺少必需的参数: merchantId'
    });
  }

  if (cookie === undefined) {
    return res.status(400).json({
      success: false,
      message: '缺少必需的参数: cookie'
    });
  }

  try {
    // 检查商家是否存在
    const merchant = await db.getMerchantById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: '商家不存在'
      });
    }

    // 更新cookie
    await db.updateMerchant(merchantId, { cookie });

    return res.status(200).json({
      success: true,
      message: 'Cookie更新成功',
      data: {
        merchantId,
        merchantName: merchant.name
      }
    });
  } catch (error) {
    console.error('更新商家Cookie失败:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
