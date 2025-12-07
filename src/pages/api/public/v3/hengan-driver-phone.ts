import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '仅支持 GET 请求'
    });
  }

  try {
    await db.init();
    await db.migrateFromJson();

    const henganDriverPhone = await db.getSetting('henganDriverPhone');

    return res.status(200).json({
      success: true,
      message: '获取恒安送货手机号成功',
      data: {
        driverPhone: henganDriverPhone || ''
      }
    });
  } catch (error) {
    console.error('获取恒安送货手机号失败:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
