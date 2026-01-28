export interface Merchant {
  id: string;
  createdAt: string;
  name: string;
  merchantId: string;
  pinduoduoName: string;
  pinduoduoShopId: string;   // 多多买菜店铺ID
  warehouse1: string;
  groupName: string;
  sendMessage: boolean;
  sendOrderScreenshot: boolean; // 是否发送订单截图
  mentionList: string[];
  subAccount: string;        // 子账号
  pinduoduoPassword: string; // 多多密码
  cookie: string;            // 商家登录cookie
}

export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  createdAt: string;
  isActive: boolean;
}

export interface UserFormData {
  username: string;
  password: string;
  displayName: string;
  isActive: boolean;
}

export interface Column {
  name: string;
  uid: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// 用于表单验证的类型
export interface MerchantFormData {
  name: string;
  merchantId: string;
  pinduoduoName: string;
  pinduoduoShopId: string;   // 多多买菜店铺ID
  warehouse1: string;
  groupName: string;
  sendMessage: boolean;
  sendOrderScreenshot: boolean; // 是否发送订单截图
  mentionList: string[];
  subAccount: string;        // 子账号
  pinduoduoPassword: string; // 多多密码
  cookie: string;            // 商家登录cookie
}

// 商品接口
export interface Product {
  id: string;
  createdAt: string;
  pinduoduoProductId: string;
  pinduoduoProductImage: string;
  productName: string;
  pinduoduoProductName: string;
  productSpec: string;         // 商品规格
  merchantId: string;
}

export interface ProductFormData {
  pinduoduoProductId: string;
  pinduoduoProductImage: string;
  productName: string;
  pinduoduoProductName: string;
  productSpec: string;         // 商品规格
  merchantId: string;
}

// 商品销售订单接口
export interface ProductSalesOrder {
  id: string;
  createdAt: string;
  updatedAt: string;         // 更新时间
  shopName: string;          // 店铺名称
  shopId: string;            // 店铺id
  productId: string;         // 商品id
  productName: string;       // 商品名称
  productImage: string;      // 商品图片
  salesArea: string;         // 销售区域
  warehouseInfo: string;     // 仓库信息
  salesDate: string;         // 销售日期
  salesSpec: string;         // 销售规格
  totalStock: number;        // 仓库总库存
  estimatedSales: number;    // 仓库预估总销售数
  totalSales: number;        // 仓库总销售数
  salesQuantity: number;     // 销售数(份)
}

// 当日送货接口
export interface DailyDelivery {
  id: string;
  createdAt: string;
  merchantName: string;       // 商家名称
  productName: string;         // 商品名称
  unit: string;                // 单位
  dispatchQuantity: number;    // 派单数量
  estimatedSales: number;      // 预估销售
  surplusQuantity: number;     // 昨日余货数量
  distributionStatus: number;  // 配货状态：0-未配货、1-已配货、3-改配
  warehousingStatus: number;   // 入库状态：0-未入库、1-已入库
  entryUser: string;           // 录入人
  operators: string;           // 操作人列表（JSON字符串数组）
  deliveryDate: string;        // 日期（YYYY-MM-DD格式）
}

export interface DailyDeliveryFormData {
  merchantName: string;
  productName: string;
  unit: string;
  dispatchQuantity: number;
  estimatedSales: number;
  surplusQuantity: number;     // 昨日余货数量
  distributionStatus: number;
  warehousingStatus: number;
  entryUser: string;
  deliveryDate: string;
}

// 数据类型枚举
export const DataTypes = {
  SURPLUS: 0,    // 余货
  RETURN: 1,     // 客退
} as const;

// 余货/客退明细接口
export interface ReturnDetail {
  id: string;
  createdAt: string;
  merchantName: string;        // 商家名称
  productName: string;          // 商品名称
  unit: string;                 // 单位
  actualReturnQuantity: number; // 实际退库数量
  goodQuantity: number;         // 正品数量
  defectiveQuantity: number;    // 残品数量
  retrievalStatus: number;      // 取回状态：0-未取回、1-已取回
  retrievedGoodQuantity: number;    // 取回正品数
  retrievedDefectiveQuantity: number; // 取回残品数
  dataType: number;             // 数据类型：0-余货、1-客退
  entryUser: string;            // 录入人
  operators: string;            // 操作人列表（JSON字符串数组）
  returnDate: string;           // 日期（YYYY-MM-DD格式）
}

export interface ReturnDetailFormData {
  merchantName: string;
  productName: string;
  unit: string;
  actualReturnQuantity: number;
  goodQuantity: number;
  defectiveQuantity: number;
  retrievalStatus: number;
  retrievedGoodQuantity: number;
  retrievedDefectiveQuantity: number;
  dataType: number;
  entryUser: string;
  returnDate: string;
}

// 员工接口
export interface Employee {
  id: string;
  createdAt: string;
  employeeNumber: string;  // 员工编号
  name: string;            // 员工名字
  realName: string;        // 真实姓名
  phone: string;           // 手机号码
  password: string;        // 密码（哈希后存储）
  loginCode: string;       // 登录码（8位英文数字大写）
  lastLoginTime?: string;  // 最后登录时间
}

export interface EmployeeFormData {
  employeeNumber: string;
  name: string;
  realName: string;
  phone: string;
  password?: string;       // 新增时必填，编辑时可选
  loginCode: string;
}

// 操作日志接口
export interface OperationLog {
  id: string;
  createdAt: string;
  targetTable: string;           // 目标表: daily_deliveries / return_details
  targetId: string;              // 目标记录ID
  action: string;                // 操作类型: create / update / delete / batch_import / status_change
  operatorType: string;          // 操作人类型: admin / employee
  operatorId: string;            // 操作人ID
  operatorName: string;          // 操作人名称
  fieldName?: string;            // 修改的字段名
  oldValue?: string;             // 修改前的值
  newValue?: string;             // 修改后的值
  changeDetail?: string;         // 完整变更内容 JSON
  remark?: string;               // 备注
}

export interface OperationLogFormData {
  targetTable: string;
  targetId: string;
  action: string;
  operatorType: string;
  operatorId: string;
  operatorName: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changeDetail?: string;
  remark?: string;
}

// 操作类型枚举
export const OperationActions = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  BATCH_IMPORT: 'batch_import',
  STATUS_CHANGE: 'status_change',
} as const;

// 操作人类型枚举
export const OperatorTypes = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const;

// 分页相关类型（从pagination.ts导出）
export type { PaginationParams, PaginationResult } from './pagination'; 