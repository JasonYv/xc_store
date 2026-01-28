import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse, Employee } from '@/lib/types';
import { getPinyinInitials, generateRandomLoginCode } from '@/lib/pinyin';

// 员工注册响应数据（不包含密码）
type EmployeeRegisterResponse = Omit<Employee, 'password'>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<EmployeeRegisterResponse | null>>
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
    const { name, phone, password } = req.body;

    // 验证必填字段
    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '请填写姓名、手机号和密码'
      });
    }

    // 验证姓名长度
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '姓名至少需要2个字符'
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

    // 验证密码长度
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '密码至少需要6个字符'
      });
    }

    // 检查手机号是否已存在
    const existingEmployee = await db.getEmployeeByPhone(phone);
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '该手机号已被注册'
      });
    }

    // 自动生成员工编号：拼音首字母 + 自增数字
    const pinyinInitials = getPinyinInitials(name.trim());
    if (!pinyinInitials) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '无法从姓名中提取拼音首字母，请检查姓名是否正确'
      });
    }

    const nextNumber = await db.getNextEmployeeNumberSuffix();
    const employeeNumber = `${pinyinInitials}${nextNumber}`;

    // 自动生成登录码（8位大写字母和数字）
    let loginCode = generateRandomLoginCode(8);

    // 检查登录码是否已存在，如果存在则重新生成
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const existingByCode = await db.getEmployeeByLoginCode(loginCode);
      if (!existingByCode) {
        break;
      }
      loginCode = generateRandomLoginCode(8);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({
        success: false,
        data: null,
        error: '系统繁忙，请稍后重试'
      });
    }

    // 创建员工
    const newEmployee = await db.insertEmployee({
      employeeNumber,
      name: name.trim(),
      realName: name.trim(), // 注册时姓名和真实姓名相同
      phone,
      password,
      loginCode
    });

    // 返回时不包含密码
    const { password: _, ...employeeWithoutPassword } = newEmployee;

    return res.status(201).json({
      success: true,
      data: employeeWithoutPassword
    });
  } catch (error: any) {
    console.error('Employee register API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
