import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  await db.migrateFromJson();

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '仅支持 GET 请求'
    });
  }

  // 验证API Key - 从数据库读取系统设置中的 API Key
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const systemApiKey = await db.getSetting('apiKey');

  if (!apiKey || !systemApiKey || apiKey !== systemApiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key 无效'
    });
  }

  try {
    // 获取所有商家
    const merchants = await db.getAllMerchants();

    // 只返回必要的字段:id, name, subAccount, pinduoduoPassword, cookie
    const credentials = merchants.map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      merchantId: merchant.merchantId,
      pinduoduoName: merchant.pinduoduoName,
      subAccount: merchant.subAccount,
      pinduoduoPassword: merchant.pinduoduoPassword,
      cookie: merchant.cookie
    }));

    return res.status(200).json({
      success: true,
      message: '获取成功',
      data: credentials
    });
  } catch (error) {
    console.error('获取商家凭证失败:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
