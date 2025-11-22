import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`方法 ${req.method} 不允许`);
  }

  try {
    // 初始化数据库
    await db.init();

    // 获取需要发送消息的商家列表
    const merchants = await db.getAllMerchants();
    const merchantsToSend = merchants.filter(merchant => 
      merchant.sendMessage && merchant.groupName
    );

    if (merchantsToSend.length === 0) {
      return res.status(200).json({
        success: true,
        message: '没有需要发送消息的商家'
      });
    }

    // 这里可以添加实际的消息发送逻辑
    // 例如：调用外部API或消息服务

    // 模拟发送消息
    const results = merchantsToSend.map(merchant => ({
      merchantId: merchant.id,
      groupName: merchant.groupName,
      status: 'success',
      message: `消息已发送到群组: ${merchant.groupName}`
    }));

    return res.status(200).json({
      success: true,
      data: {
        total: merchantsToSend.length,
        results
      }
    });

  } catch (error) {
    console.error('发送消息时出错:', error);
    return res.status(500).json({
      success: false,
      error: '发送消息失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
} 