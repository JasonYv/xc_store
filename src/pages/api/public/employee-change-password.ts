import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse } from '@/lib/types';
import { generateRandomLoginCode } from '@/lib/pinyin';

/**
 * 员工修改密码
 *
 * 两种身份来源：
 * - 用登录码进来：{ loginCode, newPassword }        免验旧密码（相当于找回密码）
 * - 用手机号进来：{ phone, oldPassword, newPassword } 必须验旧密码
 *
 * 改完密码会作废旧登录码、返回新的。调用方必须把新登录码显著展示给员工，
 * 否则员工下次用旧码登不进来。
 */

// 至少 8 位且同时包含字母和数字
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)\S{8,}$/;
const LOGIN_CODE_REGEX = /^[A-Z0-9]{8}$/;
const MAX_LOGIN_CODE_ATTEMPTS = 10;

type ChangePasswordResponse = {
  loginCode: string;
};

/** 生成一个当前没被占用的登录码；始终拿不到就返回 null */
async function generateUniqueLoginCode(): Promise<string | null> {
  for (let i = 0; i < MAX_LOGIN_CODE_ATTEMPTS; i++) {
    const code = generateRandomLoginCode(8);
    const existing = await db.getEmployeeByLoginCode(code);
    if (!existing) return code;
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ChangePasswordResponse | null>>
) {
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
    const { loginCode, phone, oldPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: '请输入新密码'
      });
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '新密码至少8位，且必须同时包含字母和数字'
      });
    }

    // 确定是哪个员工。登录码优先——前端不会两种都传，这里定个次序避免歧义
    let employee = null;

    if (loginCode) {
      if (typeof loginCode !== 'string' || !LOGIN_CODE_REGEX.test(loginCode.toUpperCase())) {
        return res.status(400).json({
          success: false,
          data: null,
          error: '登录码格式错误'
        });
      }
      employee = await db.getEmployeeByLoginCode(loginCode.toUpperCase());
      if (!employee) {
        return res.status(401).json({
          success: false,
          data: null,
          error: '登录码无效'
        });
      }
    } else if (phone) {
      if (!oldPassword || typeof oldPassword !== 'string') {
        return res.status(400).json({
          success: false,
          data: null,
          error: '请输入原密码'
        });
      }
      // 手机号这条路必须验旧密码
      employee = await db.validateEmployeeByPhone(phone, oldPassword);
      if (!employee) {
        // 不区分「手机号不存在」和「密码错误」，避免被用来探测账号
        return res.status(401).json({
          success: false,
          data: null,
          error: '手机号或原密码错误'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        data: null,
        error: '请提供登录码或手机号'
      });
    }

    // 新旧密码相同没有意义，而且改了还要换登录码，白白让员工重记一次
    if (employee.password === db.hashEmployeePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '新密码不能与原密码相同'
      });
    }

    // 先拿到可用的新登录码，再和密码一起写入。
    // 不能先改密码后换码——中间失败会变成「密码已变、码还是旧的」，两边都对不上
    const newLoginCode = await generateUniqueLoginCode();
    if (!newLoginCode) {
      return res.status(500).json({
        success: false,
        data: null,
        error: '系统繁忙，请稍后重试'
      });
    }

    // updateEmployee 内部会做登录码查重和密码哈希
    const updated = await db.updateEmployee(employee.id, {
      password: newPassword,
      loginCode: newLoginCode
    });

    if (!updated) {
      return res.status(500).json({
        success: false,
        data: null,
        error: '修改失败，请稍后重试'
      });
    }

    return res.status(200).json({
      success: true,
      data: { loginCode: newLoginCode }
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '修改密码失败'
    });
  }
}
