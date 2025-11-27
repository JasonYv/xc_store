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

    // 获取送货司机手机号配置
    const driverPhone = await db.getSetting('driverPhone');

    return res.status(200).json({
      success: true,
      message: '获取送货司机手机号成功',
      data: {
        driverPhone: driverPhone || ''
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
