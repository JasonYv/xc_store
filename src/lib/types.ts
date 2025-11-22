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
  merchantId: string;
}

export interface ProductFormData {
  pinduoduoProductId: string;
  pinduoduoProductImage: string;
  productName: string;
  pinduoduoProductName: string;
  merchantId: string;
}

// 商品销售订单接口
export interface ProductSalesOrder {
  id: string;
  createdAt: string;
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

// 分页相关类型（从pagination.ts导出）
export type { PaginationParams, PaginationResult } from './pagination'; 