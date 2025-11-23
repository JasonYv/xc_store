import { NextApiRequest, NextApiResponse } from 'next';
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
    const { id, pinduoduoShopId, pinduoduoName } = req.body;
    console.log('接收到的请求体:', req.body);

    // 验证必填参数（系统商家ID）
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '缺少商家系统ID参数 (id)'
      });
    }

    // 查询商家是否存在
    const merchant = await db.getMerchantById(id);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: '商家不存在'
      });
    }

    // 构建更新数据（只更新提供的字段）
    const updateData: { [key: string]: any } = {};

    if (pinduoduoShopId !== undefined) {
      updateData.pinduoduoShopId = pinduoduoShopId;
      console.log('更新 pinduoduoShopId:', pinduoduoShopId);
    }

    if (pinduoduoName !== undefined) {
      updateData.pinduoduoName = pinduoduoName;
      console.log('更新 pinduoduoName:', pinduoduoName);
    }

    console.log('最终更新数据:', updateData);

    // 检查是否有字段需要更新
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的字段 (pinduoduoShopId, pinduoduoName)'
      });
    }

    // 更新商家信息
    const updatedMerchant = await db.updateMerchant(id, updateData);

    if (!updatedMerchant) {
      return res.status(500).json({
        success: false,
        message: '更新商家信息失败'
      });
    }

    return res.status(200).json({
      success: true,
      message: '商家信息更新成功',
      data: {
        id: updatedMerchant.id,
        name: updatedMerchant.name,
        pinduoduoShopId: updatedMerchant.pinduoduoShopId,
        pinduoduoName: updatedMerchant.pinduoduoName
      }
    });

  } catch (error) {
    console.error('更新商家信息失败:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
