import type { NextApiRequest, NextApiResponse } from 'next';
import { CONFIG } from '@/config';
import db from '@/lib/sqlite-db';
import { Merchant } from '@/lib/types';

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: '不支持的请求方法' });
  }

  // API key 验证
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== CONFIG.api.key) {
    return res.status(401).json({ error: '无效的API密钥' });
  }

  try {
    // 初始化数据库连接
    await db.init();
    
    // 获取所有商家
    const merchants = await db.getAllMerchants();
    
    // 过滤出开启消息通知的商家
    const enabledMerchants = merchants.filter((merchant: Merchant) => merchant.sendMessage);

    // 返回简化的商家信息
    const response = enabledMerchants.map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      warehouse1: merchant.warehouse1,
      groupName: merchant.groupName,
      mentionList: merchant.mentionList
    }));

    return res.status(200).json({
      success: true,
      data: response,
      total: response.length
    });

  } catch (error) {
    console.error('获取商家数据失败:', error);
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
} 