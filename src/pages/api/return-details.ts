import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse, ReturnDetail, ReturnDetailFormData, OperationActions, OperatorTypes } from '@/lib/types';

// 记录操作日志的辅助函数
async function logOperation(
  targetId: string,
  action: string,
  operatorType: string,
  operatorId: string,
  operatorName: string,
  options?: {
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    changeDetail?: string;
    remark?: string;
  }
) {
  try {
    await db.insertOperationLog({
      targetTable: 'return_details',
      targetId,
      action,
      operatorType,
      operatorId,
      operatorName,
      ...options
    });
  } catch (error) {
    console.error('Failed to log operation:', error);
    // 日志记录失败不影响主流程
  }
}

// 比较两个对象的差异
function getChanges(oldData: any, newData: any): { fieldName: string; oldValue: string; newValue: string }[] {
  const changes: { fieldName: string; oldValue: string; newValue: string }[] = [];
  const fields = ['merchantName', 'productName', 'unit', 'actualReturnQuantity', 'goodQuantity',
                  'defectiveQuantity', 'retrievalStatus', 'retrievedGoodQuantity', 'retrievedDefectiveQuantity',
                  'dataType', 'entryUser', 'returnDate'];

  for (const field of fields) {
    if (newData[field] !== undefined && String(oldData[field]) !== String(newData[field])) {
      changes.push({
        fieldName: field,
        oldValue: String(oldData[field]),
        newValue: String(newData[field])
      });
    }
  }
  return changes;
}

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
        const { page = '1', pageSize = '10', merchantName, productName, returnDate, retrievalStatus, dataType } = req.query;

        const filters: any = {};
        if (merchantName) filters.merchantName = merchantName as string;
        if (productName) filters.productName = productName as string;
        if (returnDate) filters.returnDate = returnDate as string;
        if (retrievalStatus !== undefined && retrievalStatus !== '') filters.retrievalStatus = parseInt(retrievalStatus as string);
        if (dataType !== undefined && dataType !== '') filters.dataType = parseInt(dataType as string);

        const result = await db.getReturnDetailsPaginated(
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
        const returnData: ReturnDetailFormData & {
          _operatorType?: string;
          _operatorId?: string;
          _operatorName?: string;
          _isBatchImport?: boolean;
        } = req.body;

        // 验证必填字段
        if (!returnData.merchantName || !returnData.productName || !returnData.unit || !returnData.entryUser || !returnData.returnDate) {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少必填字段'
          });
        }

        const newReturnDetail = await db.insertReturnDetail({
          merchantName: returnData.merchantName,
          productName: returnData.productName,
          unit: returnData.unit,
          actualReturnQuantity: returnData.actualReturnQuantity || 0,
          goodQuantity: returnData.goodQuantity || 0,
          defectiveQuantity: returnData.defectiveQuantity || 0,
          retrievalStatus: returnData.retrievalStatus || 0,
          retrievedGoodQuantity: returnData.retrievedGoodQuantity || 0,
          retrievedDefectiveQuantity: returnData.retrievedDefectiveQuantity || 0,
          dataType: returnData.dataType || 0,
          entryUser: returnData.entryUser,
          operators: '[]',
          returnDate: returnData.returnDate
        });

        // 记录操作日志
        const operatorType = returnData._operatorType || OperatorTypes.ADMIN;
        const operatorId = returnData._operatorId || 'unknown';
        const operatorName = returnData._operatorName || returnData.entryUser;
        const action = returnData._isBatchImport ? OperationActions.BATCH_IMPORT : OperationActions.CREATE;

        await logOperation(
          newReturnDetail.id,
          action,
          operatorType,
          operatorId,
          operatorName,
          {
            changeDetail: JSON.stringify(newReturnDetail),
            remark: action === OperationActions.BATCH_IMPORT ? '批量导入' : '新增记录'
          }
        );

        return res.status(201).json({
          success: true,
          data: newReturnDetail
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

        const updatedData: Partial<ReturnDetail> & {
          _operatorType?: string;
          _operatorId?: string;
          _operatorName?: string;
          _isStatusChange?: boolean;
        } = req.body;

        // 获取原始数据用于比较
        const oldReturnDetail = await db.getReturnDetailById(id);
        if (!oldReturnDetail) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '余货/客退记录不存在'
          });
        }

        // 移除操作人信息字段后更新
        const { _operatorType, _operatorId, _operatorName, _isStatusChange, ...dataToUpdate } = updatedData;
        const updatedReturnDetail = await db.updateReturnDetail(id, dataToUpdate);

        if (!updatedReturnDetail) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '更新失败'
          });
        }

        // 记录操作日志
        const operatorType = _operatorType || OperatorTypes.ADMIN;
        const operatorId = _operatorId || 'unknown';
        const operatorName = _operatorName || 'unknown';
        const changes = getChanges(oldReturnDetail, dataToUpdate);

        // 判断是状态变更还是普通更新
        const isStatusChange = _isStatusChange || changes.some(c => c.fieldName === 'retrievalStatus');
        const action = isStatusChange ? OperationActions.STATUS_CHANGE : OperationActions.UPDATE;

        // 生成变更备注
        let remark = '';
        if (isStatusChange) {
          const statusChange = changes.find(c => c.fieldName === 'retrievalStatus');
          if (statusChange) {
            const statusLabels: Record<string, string> = { '0': '未取回', '1': '已取回' };
            remark = `取回状态: ${statusLabels[statusChange.oldValue] || statusChange.oldValue} → ${statusLabels[statusChange.newValue] || statusChange.newValue}`;
          }
        } else {
          remark = `修改了 ${changes.map(c => c.fieldName).join(', ')}`;
        }

        if (changes.length > 0) {
          await logOperation(
            id,
            action,
            operatorType,
            operatorId,
            operatorName,
            {
              changeDetail: JSON.stringify(changes),
              remark
            }
          );
        }

        return res.status(200).json({
          success: true,
          data: updatedReturnDetail
        });
      }

      case 'DELETE': {
        const { id, _operatorType, _operatorId, _operatorName } = req.query;

        if (!id || typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少 ID 参数'
          });
        }

        // 获取原始数据用于日志记录
        const oldReturnDetail = await db.getReturnDetailById(id);
        if (!oldReturnDetail) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '余货/客退记录不存在'
          });
        }

        const deleted = await db.deleteReturnDetail(id);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '删除失败'
          });
        }

        // 记录删除日志
        const operatorType = (_operatorType as string) || OperatorTypes.ADMIN;
        const operatorId = (_operatorId as string) || 'unknown';
        const operatorName = (_operatorName as string) || 'unknown';

        await logOperation(
          id,
          OperationActions.DELETE,
          operatorType,
          operatorId,
          operatorName,
          {
            changeDetail: JSON.stringify(oldReturnDetail),
            remark: `删除记录: ${oldReturnDetail.merchantName} - ${oldReturnDetail.productName}`
          }
        );

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
