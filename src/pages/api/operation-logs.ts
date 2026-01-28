import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse, OperationLog, OperationLogFormData } from '@/lib/types';
import { PaginationResult } from '@/lib/pagination';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OperationLog | OperationLog[] | PaginationResult<OperationLog> | null>>
) {
  // 初始化数据库
  await db.init();
  await db.migrateFromJson();

  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const {
          id,
          targetTable,
          targetId,
          page = '1',
          pageSize = '20',
          action,
          operatorType,
          operatorId,
          operatorName,
          startDate,
          endDate
        } = req.query;

        // 如果有 id，返回单条记录
        if (id && typeof id === 'string') {
          const log = await db.getOperationLogById(id);
          if (!log) {
            return res.status(404).json({
              success: false,
              data: null,
              error: '日志记录不存在'
            });
          }
          return res.status(200).json({
            success: true,
            data: log
          });
        }

        // 如果有 targetTable 和 targetId，返回该记录的所有日志
        if (targetTable && targetId && typeof targetTable === 'string' && typeof targetId === 'string') {
          const logs = await db.getOperationLogsByTarget(targetTable, targetId);
          return res.status(200).json({
            success: true,
            data: logs
          });
        }

        // 分页查询
        const pageNum = parseInt(page as string, 10) || 1;
        const pageSizeNum = parseInt(pageSize as string, 10) || 20;

        const filters: {
          targetTable?: string;
          targetId?: string;
          action?: string;
          operatorType?: string;
          operatorId?: string;
          operatorName?: string;
          startDate?: string;
          endDate?: string;
        } = {};

        if (targetTable && typeof targetTable === 'string') filters.targetTable = targetTable;
        if (action && typeof action === 'string') filters.action = action;
        if (operatorType && typeof operatorType === 'string') filters.operatorType = operatorType;
        if (operatorId && typeof operatorId === 'string') filters.operatorId = operatorId;
        if (operatorName && typeof operatorName === 'string') filters.operatorName = operatorName;
        if (startDate && typeof startDate === 'string') filters.startDate = startDate;
        if (endDate && typeof endDate === 'string') filters.endDate = endDate;

        const result = await db.getOperationLogsPaginated(
          pageNum,
          pageSizeNum,
          Object.keys(filters).length > 0 ? filters : undefined
        );

        return res.status(200).json({
          success: true,
          data: result
        });
      }

      case 'POST': {
        // 创建新日志记录
        const logData: OperationLogFormData = req.body;

        // 验证必填字段
        if (!logData.targetTable || !logData.targetId || !logData.action ||
            !logData.operatorType || !logData.operatorId || !logData.operatorName) {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少必填字段'
          });
        }

        const newLog = await db.insertOperationLog(logData);

        return res.status(201).json({
          success: true,
          data: newLog
        });
      }

      case 'DELETE': {
        // 删除日志记录（仅管理员可用，通常不建议删除）
        const { id, cleanDays } = req.query;

        // 清理旧日志
        if (cleanDays && typeof cleanDays === 'string') {
          const days = parseInt(cleanDays, 10);
          if (isNaN(days) || days < 1) {
            return res.status(400).json({
              success: false,
              data: null,
              error: '无效的天数参数'
            });
          }

          const deletedCount = await db.cleanOldOperationLogs(days);
          return res.status(200).json({
            success: true,
            data: null,
            error: `已清理 ${deletedCount} 条旧日志`
          });
        }

        // 删除单条日志
        if (!id || typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少日志ID'
          });
        }

        const deleted = await db.deleteOperationLog(id);
        if (!deleted) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '日志记录不存在'
          });
        }

        return res.status(200).json({
          success: true,
          data: null
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({
          success: false,
          data: null,
          error: `Method ${method} Not Allowed`
        });
    }
  } catch (error: any) {
    console.error('Operation logs API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
