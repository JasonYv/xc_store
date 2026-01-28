import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse, Employee, EmployeeFormData } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  // 初始化数据库
  await db.init();
  await db.migrateFromJson();

  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const { page = '1', pageSize = '10', name, employeeNumber, realName } = req.query;

        const filters: any = {};
        if (name) filters.name = name as string;
        if (employeeNumber) filters.employeeNumber = employeeNumber as string;
        if (realName) filters.realName = realName as string;

        const result = await db.getEmployeesPaginated(
          parseInt(page as string),
          parseInt(pageSize as string),
          filters
        );

        return res.status(200).json({
          success: true,
          data: result
        });
      }

      case 'POST': {
        const employeeData: EmployeeFormData = req.body;

        // 验证必填字段
        if (!employeeData.employeeNumber || !employeeData.name || !employeeData.realName || !employeeData.loginCode) {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少必填字段'
          });
        }

        // 验证登录码格式（8位英文数字大写）
        const loginCodeRegex = /^[A-Z0-9]{8}$/;
        if (!loginCodeRegex.test(employeeData.loginCode)) {
          return res.status(400).json({
            success: false,
            data: null,
            error: '登录码必须是8位英文数字大写组合'
          });
        }

        // 验证手机号格式（如果提供）
        if (employeeData.phone) {
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(employeeData.phone)) {
            return res.status(400).json({
              success: false,
              data: null,
              error: '手机号格式不正确'
            });
          }
        }

        const newEmployee = await db.insertEmployee({
          employeeNumber: employeeData.employeeNumber,
          name: employeeData.name,
          realName: employeeData.realName,
          phone: employeeData.phone || '',
          password: employeeData.password || '',
          loginCode: employeeData.loginCode
        });

        // 返回时不包含密码
        const { password, ...employeeWithoutPassword } = newEmployee;

        return res.status(201).json({
          success: true,
          data: employeeWithoutPassword
        });
      }

      case 'PUT': {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少 ID 参数'
          });
        }

        const updatedData: Partial<Employee> = req.body;

        // 如果更新登录码，验证格式
        if (updatedData.loginCode) {
          const loginCodeRegex = /^[A-Z0-9]{8}$/;
          if (!loginCodeRegex.test(updatedData.loginCode)) {
            return res.status(400).json({
              success: false,
              data: null,
              error: '登录码必须是8位英文数字大写组合'
            });
          }
        }

        // 验证手机号格式（如果提供）
        if (updatedData.phone) {
          const phoneRegex = /^1[3-9]\d{9}$/;
          if (!phoneRegex.test(updatedData.phone)) {
            return res.status(400).json({
              success: false,
              data: null,
              error: '手机号格式不正确'
            });
          }
        }

        const updatedEmployee = await db.updateEmployee(id, updatedData);

        if (!updatedEmployee) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '员工不存在'
          });
        }

        // 返回时不包含密码
        const { password, ...employeeWithoutPassword } = updatedEmployee;

        return res.status(200).json({
          success: true,
          data: employeeWithoutPassword
        });
      }

      case 'DELETE': {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少 ID 参数'
          });
        }

        const deleted = await db.deleteEmployee(id);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '员工不存在'
          });
        }

        return res.status(200).json({
          success: true,
          data: { id }
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          data: null,
          error: `Method ${method} Not Allowed`
        });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
