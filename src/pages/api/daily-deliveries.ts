import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse, DailyDelivery, DailyDeliveryFormData, OperationActions, OperatorTypes } from '@/lib/types';

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
      targetTable: 'daily_deliveries',
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

// 字段名中文映射
const fieldLabelMap: Record<string, string> = {
  merchantName: '商家名称',
  productName: '商品名称',
  unit: '单位',
  dispatchQuantity: '派单数量',
  estimatedSales: '预估销售',
  surplusQuantity: '昨日余货',
  distributionStatus: '配货状态',
  warehousingStatus: '入库状态',
  entryUser: '录入人',
  deliveryDate: '日期',
};

// 比较两个对象的差异
function getChanges(oldData: any, newData: any): { fieldName: string; oldValue: string; newValue: string }[] {
  const changes: { fieldName: string; oldValue: string; newValue: string }[] = [];
  const fields = ['merchantName', 'productName', 'unit', 'dispatchQuantity', 'estimatedSales', 'surplusQuantity',
                  'distributionStatus', 'warehousingStatus', 'entryUser', 'deliveryDate'];

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
        const { page = '1', pageSize = '10', merchantName, productName, deliveryDate, distributionStatus, warehousingStatus } = req.query;

        const filters: any = {};
        if (merchantName) filters.merchantName = merchantName as string;
        if (productName) filters.productName = productName as string;
        if (deliveryDate) filters.deliveryDate = deliveryDate as string;
        if (distributionStatus !== undefined && distributionStatus !== '') filters.distributionStatus = parseInt(distributionStatus as string);
        if (warehousingStatus !== undefined && warehousingStatus !== '') filters.warehousingStatus = parseInt(warehousingStatus as string);

        const result = await db.getDailyDeliveriesPaginated(
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
        const deliveryData: DailyDeliveryFormData & {
          _operatorType?: string;
          _operatorId?: string;
          _operatorName?: string;
          _isBatchImport?: boolean;
        } = req.body;

        // 验证必填字段
        if (!deliveryData.merchantName || !deliveryData.productName || !deliveryData.unit || !deliveryData.entryUser || !deliveryData.deliveryDate) {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少必填字段'
          });
        }

        const newDelivery = await db.insertDailyDelivery({
          merchantName: deliveryData.merchantName,
          productName: deliveryData.productName,
          unit: deliveryData.unit,
          dispatchQuantity: deliveryData.dispatchQuantity || 0,
          estimatedSales: deliveryData.estimatedSales || 0,
          surplusQuantity: deliveryData.surplusQuantity || 0,
          distributionStatus: deliveryData.distributionStatus || 0,
          warehousingStatus: deliveryData.warehousingStatus || 0,
          entryUser: deliveryData.entryUser,
          operators: '[]',
          deliveryDate: deliveryData.deliveryDate
        });

        // 记录操作日志
        const operatorType = deliveryData._operatorType || OperatorTypes.ADMIN;
        const operatorId = deliveryData._operatorId || 'unknown';
        const operatorName = deliveryData._operatorName || deliveryData.entryUser;
        const action = deliveryData._isBatchImport ? OperationActions.BATCH_IMPORT : OperationActions.CREATE;

        const recordInfo = `【${newDelivery.merchantName}】${newDelivery.productName} (${newDelivery.deliveryDate}) 派单:${newDelivery.dispatchQuantity} 预估:${newDelivery.estimatedSales} 昨日余货:${newDelivery.surplusQuantity}`;
        const remarkText = action === OperationActions.BATCH_IMPORT
          ? `批量导入: ${recordInfo}`
          : `新增记录: ${recordInfo}`;

        await logOperation(
          newDelivery.id,
          action,
          operatorType,
          operatorId,
          operatorName,
          {
            changeDetail: JSON.stringify({
              record: {
                merchantName: newDelivery.merchantName,
                productName: newDelivery.productName,
                unit: newDelivery.unit,
                dispatchQuantity: newDelivery.dispatchQuantity,
                estimatedSales: newDelivery.estimatedSales,
                surplusQuantity: newDelivery.surplusQuantity,
                deliveryDate: newDelivery.deliveryDate,
              }
            }),
            remark: remarkText
          }
        );

        return res.status(201).json({
          success: true,
          data: newDelivery
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

        const updatedData: Partial<DailyDelivery> & {
          _operatorType?: string;
          _operatorId?: string;
          _operatorName?: string;
          _isStatusChange?: boolean;
        } = req.body;

        // 获取原始数据用于比较
        const oldDelivery = await db.getDailyDeliveryById(id);
        if (!oldDelivery) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '当日送货记录不存在'
          });
        }

        // 移除操作人信息字段后更新
        const { _operatorType, _operatorId, _operatorName, _isStatusChange, ...dataToUpdate } = updatedData;
        const updatedDelivery = await db.updateDailyDelivery(id, dataToUpdate);

        if (!updatedDelivery) {
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
        const changes = getChanges(oldDelivery, dataToUpdate);

        // 判断是状态变更还是普通更新
        const isStatusChange = _isStatusChange ||
          changes.some(c => c.fieldName === 'distributionStatus' || c.fieldName === 'warehousingStatus');
        const action = isStatusChange ? OperationActions.STATUS_CHANGE : OperationActions.UPDATE;

        // 生成变更备注（包含详细的数据信息）
        const recordInfo = `【${oldDelivery.merchantName}】${oldDelivery.productName} (${oldDelivery.deliveryDate})`;
        let remark = '';
        if (isStatusChange) {
          const statusChanges = changes.filter(c =>
            c.fieldName === 'distributionStatus' || c.fieldName === 'warehousingStatus'
          );
          const statusLabels: Record<string, Record<string, string>> = {
            distributionStatus: { '0': '未配货', '1': '已配货', '3': '改配' },
            warehousingStatus: { '0': '未入库', '1': '已入库' }
          };
          const statusChangeText = statusChanges.map(c => {
            const labels = statusLabels[c.fieldName] || {};
            return `${c.fieldName === 'distributionStatus' ? '配货状态' : '入库状态'}: ${labels[c.oldValue] || c.oldValue} → ${labels[c.newValue] || c.newValue}`;
          }).join('; ');
          remark = `${recordInfo} ${statusChangeText}`;
        } else {
          remark = `${recordInfo} 修改了 ${changes.map(c => fieldLabelMap[c.fieldName] || c.fieldName).join(', ')}`;
        }

        if (changes.length > 0) {
          await logOperation(
            id,
            action,
            operatorType,
            operatorId,
            operatorName,
            {
              changeDetail: JSON.stringify({
                record: {
                  merchantName: oldDelivery.merchantName,
                  productName: oldDelivery.productName,
                  unit: oldDelivery.unit,
                  deliveryDate: oldDelivery.deliveryDate,
                },
                changes
              }),
              remark
            }
          );
        }

        return res.status(200).json({
          success: true,
          data: updatedDelivery
        });
      }

      case 'DELETE': {
        const { id, clearDate, _operatorType, _operatorId, _operatorName } = req.query;

        // 批量删除指定日期的所有数据
        if (clearDate && typeof clearDate === 'string') {
          const deletedCount = await db.deleteDailyDeliveriesByDate(clearDate);

          // 记录批量删除日志
          await logOperation(
            'batch-clear',
            OperationActions.DELETE,
            OperatorTypes.ADMIN,
            'admin',
            'admin',
            {
              remark: `清空当日数据: ${clearDate}，共删除 ${deletedCount} 条记录`
            }
          );

          return res.status(200).json({
            success: true,
            data: { deletedCount, date: clearDate }
          });
        }

        // 单条删除
        if (!id || typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            data: null,
            error: '缺少 ID 参数'
          });
        }

        // 获取原始数据用于日志记录
        const oldDelivery = await db.getDailyDeliveryById(id);
        if (!oldDelivery) {
          return res.status(404).json({
            success: false,
            data: null,
            error: '当日送货记录不存在'
          });
        }

        const deleted = await db.deleteDailyDelivery(id);

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
            changeDetail: JSON.stringify({
              record: {
                merchantName: oldDelivery.merchantName,
                productName: oldDelivery.productName,
                unit: oldDelivery.unit,
                dispatchQuantity: oldDelivery.dispatchQuantity,
                estimatedSales: oldDelivery.estimatedSales,
                surplusQuantity: oldDelivery.surplusQuantity,
                deliveryDate: oldDelivery.deliveryDate,
              }
            }),
            remark: `删除记录: 【${oldDelivery.merchantName}】${oldDelivery.productName} (${oldDelivery.deliveryDate}) - 派单:${oldDelivery.dispatchQuantity} 预估:${oldDelivery.estimatedSales}`
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
