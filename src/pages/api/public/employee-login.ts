import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse, Employee } from '@/lib/types';

// 员工登录响应数据（不包含密码）
type EmployeeLoginResponse = Omit<Employee, 'password'>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<EmployeeLoginResponse | null>>
) {
  // 初始化数据库
  await db.init();
  await db.migrateFromJson();

  const { method } = req;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      data: null,
      error: `Method ${method} Not Allowed`
    });
  }

  try {
    const { phone, password, loginCode } = req.body;

    // 支持两种登录方式：手机号+密码 或 登录码
    if (loginCode) {
      // 登录码登录
      if (typeof loginCode !== 'string' || !/^[A-Z0-9]{8}$/.test(loginCode)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: '登录码格式不正确，必须是8位大写字母和数字'
        });
      }

      const employee = await db.getEmployeeByLoginCode(loginCode);
      if (!employee) {
        return res.status(401).json({
          success: false,
          data: null,
          error: '登录码不存在'
        });
      }

      // 更新最后登录时间
      await db.updateEmployeeLoginTime(employee.id);

      // 返回员工信息（不包含密码）
      const { password: _, ...employeeWithoutPassword } = employee;

      return res.status(200).json({
        success: true,
        data: employeeWithoutPassword
      });
    }

    // 手机号+密码登录
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '请提供手机号和密码，或者登录码'
      });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '手机号格式不正确'
      });
    }

    // 验证员工登录
    const employee = await db.validateEmployeeByPhone(phone, password);

    if (!employee) {
      return res.status(401).json({
        success: false,
        data: null,
        error: '手机号或密码错误'
      });
    }

    // 返回员工信息（不包含密码）
    const { password: _, ...employeeWithoutPassword } = employee;

    return res.status(200).json({
      success: true,
      data: employeeWithoutPassword
    });
  } catch (error: any) {
    console.error('Employee login API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
