import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse } from '@/lib/types';

interface WarehouseStats {
  pendingPickCount: number;    // 待分拣数（未配货）
  pendingStockCount: number;   // 待入库数（已配货但未入库）
  pendingReturnCount: number;  // 待处理客退数量
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<WarehouseStats | null>>
) {
  // 初始化数据库
  await db.init();
  await db.migrateFromJson();

  const { method } = req;

  try {
    if (method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        data: null,
        error: `Method ${method} Not Allowed`
      });
    }

    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0];

    // 查询待分拣数（未配货，distributionStatus = 0）
    const pendingPickCount = await db.countDailyDeliveries({
      deliveryDate: today,
      distributionStatus: 0
    });

    // 查询待入库数（已配货但未入库，distributionStatus = 1 且 warehousingStatus = 0）
    const pendingStockCount = await db.countDailyDeliveriesByCondition(
      'deliveryDate = ? AND distributionStatus = 1 AND warehousingStatus = 0',
      [today]
    );

    // 待处理客退数量（今日未取回的余货/客退记录数）
    const returnResult = await db.getReturnDetailsPaginated(1, 1, {
      returnDate: today,
      retrievalStatus: 0
    });
    const pendingReturnCount = returnResult.total;

    return res.status(200).json({
      success: true,
      data: {
        pendingPickCount,
        pendingStockCount,
        pendingReturnCount
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
