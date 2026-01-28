import { NextApiRequest } from 'next';
import db from '@/lib/sqlite-db';
import { Employee } from '@/lib/types';

// 员工认证结果
export interface EmployeeAuthResult {
  success: boolean;
  employee?: Omit<Employee, 'password'>;
  error?: string;
}

/**
 * 验证员工登录状态
 *
 * 支持两种认证方式：
 * 1. Authorization header: Bearer <employeeId>
 * 2. X-Employee-Id header: <employeeId>
 * 3. X-Login-Code header: <loginCode>
 */
export async function verifyEmployee(req: NextApiRequest): Promise<EmployeeAuthResult> {
  try {
    // 初始化数据库
    await db.init();

    // 方式1: Authorization Bearer Token (使用员工ID)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const employeeId = authHeader.substring(7);
      const employee = await db.getEmployeeById(employeeId);
      if (employee) {
        const { password, ...employeeWithoutPassword } = employee;
        return { success: true, employee: employeeWithoutPassword };
      }
    }

    // 方式2: X-Employee-Id header
    const employeeIdHeader = req.headers['x-employee-id'];
    if (employeeIdHeader && typeof employeeIdHeader === 'string') {
      const employee = await db.getEmployeeById(employeeIdHeader);
      if (employee) {
        const { password, ...employeeWithoutPassword } = employee;
        return { success: true, employee: employeeWithoutPassword };
      }
    }

    // 方式3: X-Login-Code header
    const loginCodeHeader = req.headers['x-login-code'];
    if (loginCodeHeader && typeof loginCodeHeader === 'string') {
      const employee = await db.getEmployeeByLoginCode(loginCodeHeader.toUpperCase());
      if (employee) {
        const { password, ...employeeWithoutPassword } = employee;
        return { success: true, employee: employeeWithoutPassword };
      }
    }

    return { success: false, error: '未提供有效的员工认证信息' };
  } catch (error: any) {
    console.error('Employee auth error:', error);
    return { success: false, error: error.message || '认证失败' };
  }
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
