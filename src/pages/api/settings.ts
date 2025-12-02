import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  // 初始化数据库
  await db.init();

  if (req.method === 'GET') {
    // 获取所有设置
    try {
      const settings = await db.getAllSettings();
      return res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error('获取设置失败:', error);
      return res.status(500).json({
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : '获取设置失败',
      });
    }
  } else if (req.method === 'POST') {
    // 保存设置
    try {
      const { driverPhone, henganDriverPhone } = req.body;

      // 验证手机号格式（可选）
      if (driverPhone && !/^1[3-9]\d{9}$/.test(driverPhone)) {
        return res.status(400).json({
          success: false,
          data: null as any,
          error: '送货司机手机号格式不正确',
        });
      }

      if (henganDriverPhone && !/^1[3-9]\d{9}$/.test(henganDriverPhone)) {
        return res.status(400).json({
          success: false,
          data: null as any,
          error: '恒安送货手机号格式不正确',
        });
      }

      // 保存司机手机号
      if (driverPhone !== undefined) {
        await db.updateSetting('driverPhone', driverPhone);
      }

      // 保存恒安送货手机号
      if (henganDriverPhone !== undefined) {
        await db.updateSetting('henganDriverPhone', henganDriverPhone);
      }

      return res.status(200).json({
        success: true,
        data: null as any,
      });
    } catch (error) {
      console.error('保存设置失败:', error);
      return res.status(500).json({
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : '保存设置失败',
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      data: null as any,
      error: `Method ${req.method} Not Allowed`,
    });
  }
}
