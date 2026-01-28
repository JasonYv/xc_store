import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse } from '@/lib/types';
import { getPinyinInitials, generateRandomLoginCode } from '@/lib/pinyin';

interface GenerateEmployeeInfoResponse {
  employeeNumber: string;
  loginCode: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GenerateEmployeeInfoResponse | null>>
) {
  // 初始化数据库
  await db.init();
  await db.migrateFromJson();

  const { method } = req;

  try {
    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({
        success: false,
        data: null,
        error: `Method ${method} Not Allowed`
      });
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: '请提供员工姓名'
      });
    }

    // 获取姓名的拼音首字母（大写）
    const pinyinInitials = getPinyinInitials(name);

    if (!pinyinInitials) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '无法从姓名中提取拼音首字母，请检查姓名是否正确'
      });
    }

    // 获取下一个员工编号的数字部分
    const nextNumber = await db.getNextEmployeeNumberSuffix();

    // 组合员工编号：拼音首字母 + 数字
    const employeeNumber = `${pinyinInitials}${nextNumber}`;

    // 生成随机登录码（8位大写字母和数字）
    let loginCode = generateRandomLoginCode(8);

    // 检查登录码是否已存在，如果存在则重新生成
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const existingEmployee = await db.getEmployeeByLoginCode(loginCode);
      if (!existingEmployee) {
        break;
      }
      loginCode = generateRandomLoginCode(8);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({
        success: false,
        data: null,
        error: '无法生成唯一的登录码，请稍后重试'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        employeeNumber,
        loginCode
      }
    });
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
