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

// ==================== 多租户（对外那半，2026-09-16）====================
// 一个租户 = 一家公司。它有自己的控制台登录账号、自己的商品映射表。
// 桌面端（商家版）凭 tenants.token 调 /api/ys/{token} 拉映射表。
// 与原有的 users/employees/merchants（云仓自用、单租户）完全分开。

export interface Tenant {
  id: string;
  createdAt: string;
  name: string;            // 公司名
  contact: string;         // 联系人（自由文本，方便记「张三 138xxxx」）
  status: boolean;         // true=启用 false=停用；停用后远程接口与登录都失效
  token: string;           // 远程配置令牌（桌面端填的那个）
  tokenCreatedAt: string;
  remark: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  createdAt: string;
  username: string;
  password: string;        // scrypt$salt$hash，见 lib/tenant-auth.ts
  displayName: string;
  role: 'owner' | 'staff'; // owner 能管员工账号，staff 只能编映射表
  isActive: boolean;
  lastLoginTime?: string;
}

export interface TenantSession {
  token: string;
  tenantId: string;
  tenantUserId: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

// 商品映射表的一行。字段名与桌面端 app/task/mapping_reader.py 的 entry 对齐，
// 这样远程 JSON 和本地 xlsx 两条路读出来的东西是同一份。
export interface ProductMapping {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  productId: string;     // 多多商品ID（唯一键的一部分）
  pddName: string;       // 多多商品名
  dispatchName: string;  // 派单表里显示的商品名
  spec: string;          // 规格 / 单位
  listCode: string;      // 金蝶代码（条形码由它的末 13 位推导，不单独存）
  boxSpec: string;       // 箱规
  category: string;      // 商品大类
}

export type ProductMappingFormData = Omit<ProductMapping, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

// 分页相关类型（从pagination.ts导出）
export type { PaginationParams, PaginationResult } from './pagination'; 