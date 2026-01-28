import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  // 初始化数据库
  await db.init();
  await db.migrateFromJson();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      data: null,
      error: `Method ${req.method} Not Allowed`
    });
  }

  try {
    const { loginCode } = req.body;

    // 验证登录码
    if (!loginCode) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '请输入登录码'
      });
    }

    // 验证登录码格式（8位英文数字大写）
    const loginCodeRegex = /^[A-Z0-9]{8}$/;
    if (!loginCodeRegex.test(loginCode)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '登录码格式错误'
      });
    }

    // 查找员工
    const employee = await db.getEmployeeByLoginCode(loginCode);

    if (!employee) {
      return res.status(401).json({
        success: false,
        data: null,
        error: '登录码不正确'
      });
    }

    // 更新登录时间
    await db.updateEmployeeLoginTime(employee.id);

    // 返回员工信息（不包含登录码）
    const { loginCode: _, ...employeeInfo } = employee;

    return res.status(200).json({
      success: true,
      data: {
        ...employeeInfo,
        lastLoginTime: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Employee login error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
