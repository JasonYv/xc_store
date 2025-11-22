import { NextApiRequest, NextApiResponse } from 'next';
import { API_CONFIG } from '@/config/api';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  await db.migrateFromJson();

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '仅支持 POST 请求'
    });
  }

  const { merchantId, message } = req.body;

  // 验证必需参数
  if (!merchantId) {
    return res.status(400).json({
      success: false,
      message: '缺少必需的参数: merchantId'
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: '缺少必需的参数: message'
    });
  }

  try {
    // 获取商家信息
    const merchant = await db.getMerchantById(merchantId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: '商家不存在'
      });
    }

    if (!merchant.groupName) {
      return res.status(400).json({
        success: false,
        message: '该商家未配置群名称'
      });
    }

    // 构建消息数据
    const messageData = {
      type: 203,
      titleList: [merchant.groupName],
      receivedContent: message.trim(),
      atList: merchant.mentionList && merchant.mentionList.length > 0
        ? merchant.mentionList
        : []
    };

    // 构建请求数据
    const requestData = {
      socketType: 2,
      list: [messageData]
    };

    // 发送HTTP请求
    const response = await fetch(
      `${API_CONFIG.SEND_MESSAGE_URL}?robotId=${API_CONFIG.ROBOT_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    return res.status(200).json({
      success: true,
      message: '消息发送成功',
      atList: merchant.mentionList || [],
      data: {
        merchantId: merchant.id,
        merchantName: merchant.name,
        groupName: merchant.groupName,
        atList: merchant.mentionList || [],
        result
      }
    });

  } catch (error) {
    console.error('发送消息失败:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
