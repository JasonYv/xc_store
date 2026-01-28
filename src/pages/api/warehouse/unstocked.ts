import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse, DailyDelivery } from '@/lib/types';
import { verifyEmployee, getTodayDateString } from '@/lib/employee-auth';

/**
 * 获取当日入库列表（已配货的记录，包含已入库和未入库）
 *
 * GET /api/warehouse/unstocked
 *
 * 请求头 (三选一):
 * - Authorization: Bearer <employeeId>
 * - X-Employee-Id: <employeeId>
 * - X-Login-Code: <loginCode>
 *
 * 查询参数:
 * - date: 可选，指定日期 (YYYY-MM-DD)，默认为今天
 *
 * 响应:
 * {
 *   success: true,
 *   data: {
 *     date: "2024-01-23",
 *     list: DailyDelivery[],  // warehousingStatus: 0=未入库, 1=已入库
 *     total: number
 *   }
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

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

    // 获取日期参数，默认为今天
    const { date } = req.query;
    const queryDate = typeof date === 'string' ? date : getTodayDateString();

    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '日期格式不正确，请使用 YYYY-MM-DD 格式'
      });
    }

    // 获取入库列表（包含已入库和未入库）
    const list = await db.getTodayStockList(queryDate);

    return res.status(200).json({
      success: true,
      data: {
        date: queryDate,
        list,
        total: list.length
      }
    });
  } catch (error: any) {
    console.error('Warehouse unstocked API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
