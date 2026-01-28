import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse } from '@/lib/types';
import { verifyEmployee } from '@/lib/employee-auth';

/**
 * 确认配货接口
 *
 * POST /api/warehouse/confirm-pick
 *
 * 请求头 (三选一):
 * - Authorization: Bearer <employeeId>
 * - X-Employee-Id: <employeeId>
 * - X-Login-Code: <loginCode>
 *
 * 请求体:
 * {
 *   id: string  // daily_deliveries 记录ID
 * }
 *
 * 响应:
 * {
 *   success: true,
 *   data: { id, message }
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
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
    // 验证员工身份
    const authResult = await verifyEmployee(req);
    if (!authResult.success || !authResult.employee) {
      return res.status(401).json({
        success: false,
        data: null,
        error: authResult.error || '未授权访问'
      });
    }

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '缺少记录ID'
      });
    }

    // 获取当前记录
    const delivery = await db.getDailyDeliveryById(id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        data: null,
        error: '记录不存在'
      });
    }

    // 检查是否已配货
    if (delivery.distributionStatus === 1) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '该记录已配货，无需重复操作'
      });
    }

    // 更新操作人列表
    const existingOperators = JSON.parse(delivery.operators || '[]');
    const newOperators = [...existingOperators];
    if (!newOperators.includes(authResult.employee.employeeNumber)) {
      newOperators.push(authResult.employee.employeeNumber);
    }

    // 更新配货状态
    const updated = await db.updateDailyDelivery(id, {
      distributionStatus: 1, // 已配货
      operators: JSON.stringify(newOperators)
    });

    if (!updated) {
      return res.status(500).json({
        success: false,
        data: null,
        error: '更新失败'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id,
        message: '配货确认成功',
        operator: authResult.employee.employeeNumber
      }
    });
  } catch (error: any) {
    console.error('Confirm pick API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
