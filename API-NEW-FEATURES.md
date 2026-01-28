# 新增功能 API 文档

本文档描述了新增的三个功能模块的 API 接口。

## 1. 当日送货 (Daily Deliveries)

### 数据模型

```typescript
interface DailyDelivery {
  id: string;
  createdAt: string;
  merchantName: string;        // 商家名称
  productName: string;          // 商品名称
  unit: string;                 // 单位
  dispatchQuantity: number;     // 派单数量
  estimatedSales: number;       // 预估销售
  distributionStatus: number;   // 配货状态：0-未配货、1-已配货、3-改配
  warehousingStatus: number;    // 入库状态：0-未入库、1-已入库
  entryUser: string;            // 录入人
  operators: string;            // 操作人列表（JSON字符串数组）
  deliveryDate: string;         // 日期（YYYY-MM-DD格式）
}
```

### API 端点

**基础路径**: `/api/daily-deliveries`

#### 获取当日送货列表（分页）

```http
GET /api/daily-deliveries?t=${Date.now()}
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 10
- `merchantName` (可选): 商家名称模糊查询
- `productName` (可选): 商品名称模糊查询
- `deliveryDate` (可选): 送货日期 (YYYY-MM-DD)
- `distributionStatus` (可选): 配货状态 (0/1/3)
- `warehousingStatus` (可选): 入库状态 (0/1)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

#### 创建当日送货记录

```http
POST /api/daily-deliveries?t=${Date.now()}
Content-Type: application/json
```

**请求体**:
```json
{
  "merchantName": "商家A",
  "productName": "产品X",
  "unit": "箱",
  "dispatchQuantity": 100,
  "estimatedSales": 95,
  "distributionStatus": 0,
  "warehousingStatus": 0,
  "entryUser": "张三",
  "deliveryDate": "2026-01-20"
}
```

#### 更新当日送货记录

```http
PUT /api/daily-deliveries?id=123456&t=${Date.now()}
Content-Type: application/json
```

**请求体**:
```json
{
  "distributionStatus": 1,
  "operators": "[\"张三\", \"李四\"]"
}
```

#### 删除当日送货记录

```http
DELETE /api/daily-deliveries?id=123456&t=${Date.now()}
```

---

## 2. 余货/客退明细 (Return Details)

### 数据模型

```typescript
interface ReturnDetail {
  id: string;
  createdAt: string;
  merchantName: string;             // 商家名称
  productName: string;              // 商品名称
  unit: string;                     // 单位
  actualReturnQuantity: number;     // 实际退库数量
  goodQuantity: number;             // 正品数量
  defectiveQuantity: number;        // 残品数量
  retrievalStatus: number;          // 取回状态：0-未取回、1-已取回
  retrievedGoodQuantity: number;    // 取回正品数
  retrievedDefectiveQuantity: number; // 取回残品数
  entryUser: string;                // 录入人
  operators: string;                // 操作人列表（JSON字符串数组）
  returnDate: string;               // 日期（YYYY-MM-DD格式）
}
```

### API 端点

**基础路径**: `/api/return-details`

#### 获取余货/客退明细列表（分页）

```http
GET /api/return-details?t=${Date.now()}
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 10
- `merchantName` (可选): 商家名称模糊查询
- `productName` (可选): 商品名称模糊查询
- `returnDate` (可选): 退货日期 (YYYY-MM-DD)
- `retrievalStatus` (可选): 取回状态 (0/1)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

#### 创建余货/客退记录

```http
POST /api/return-details?t=${Date.now()}
Content-Type: application/json
```

**请求体**:
```json
{
  "merchantName": "商家A",
  "productName": "产品X",
  "unit": "箱",
  "actualReturnQuantity": 10,
  "goodQuantity": 8,
  "defectiveQuantity": 2,
  "retrievalStatus": 0,
  "retrievedGoodQuantity": 0,
  "retrievedDefectiveQuantity": 0,
  "entryUser": "张三",
  "returnDate": "2026-01-20"
}
```

#### 更新余货/客退记录

```http
PUT /api/return-details?id=123456&t=${Date.now()}
Content-Type: application/json
```

**请求体**:
```json
{
  "retrievalStatus": 1,
  "retrievedGoodQuantity": 8,
  "retrievedDefectiveQuantity": 2,
  "operators": "[\"张三\", \"李四\"]"
}
```

#### 删除余货/客退记录

```http
DELETE /api/return-details?id=123456&t=${Date.now()}
```

---

## 3. 员工管理 (Employees)

### 数据模型

```typescript
interface Employee {
  id: string;
  createdAt: string;
  employeeNumber: string;   // 员工编号
  name: string;             // 员工名字
  realName: string;         // 真实姓名
  loginCode: string;        // 登录码（8位英文数字大写）
  lastLoginTime?: string;   // 最后登录时间
}
```

### API 端点

**基础路径**: `/api/employees`

#### 获取员工列表（分页）

```http
GET /api/employees?t=${Date.now()}
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 10
- `name` (可选): 员工名字模糊查询
- `employeeNumber` (可选): 员工编号模糊查询
- `realName` (可选): 真实姓名模糊查询

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 20,
    "page": 1,
    "pageSize": 10,
    "totalPages": 2
  }
}
```

#### 创建员工

```http
POST /api/employees?t=${Date.now()}
Content-Type: application/json
```

**请求体**:
```json
{
  "employeeNumber": "E001",
  "name": "张三",
  "realName": "张三丰",
  "loginCode": "ABC12345"
}
```

**注意**: 登录码必须是8位英文数字大写组合，例如: `ABC12345`, `XYZ99999`

#### 更新员工信息

```http
PUT /api/employees?id=123456&t=${Date.now()}
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "张三",
  "realName": "张三丰更新",
  "loginCode": "NEW12345"
}
```

#### 删除员工

```http
DELETE /api/employees?id=123456&t=${Date.now()}
```

---

### 员工登录 API

**端点**: `/api/employee-login`

#### 员工通过登录码登录

```http
POST /api/employee-login?t=${Date.now()}
Content-Type: application/json
```

**请求体**:
```json
{
  "loginCode": "ABC12345"
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "id": "123456",
    "createdAt": "2026-01-20T10:00:00.000Z",
    "employeeNumber": "E001",
    "name": "张三",
    "realName": "张三丰",
    "lastLoginTime": "2026-01-20T12:30:00.000Z"
  }
}
```

**失败响应**:
```json
{
  "success": false,
  "data": null,
  "error": "登录码不正确"
}
```

---

## 数据库表结构

### daily_deliveries 表
```sql
CREATE TABLE IF NOT EXISTS daily_deliveries (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  merchantName TEXT NOT NULL,
  productName TEXT NOT NULL,
  unit TEXT NOT NULL,
  dispatchQuantity INTEGER NOT NULL DEFAULT 0,
  estimatedSales INTEGER NOT NULL DEFAULT 0,
  distributionStatus INTEGER NOT NULL DEFAULT 0,
  warehousingStatus INTEGER NOT NULL DEFAULT 0,
  entryUser TEXT NOT NULL,
  operators TEXT NOT NULL DEFAULT '[]',
  deliveryDate TEXT NOT NULL
);
```

### return_details 表
```sql
CREATE TABLE IF NOT EXISTS return_details (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  merchantName TEXT NOT NULL,
  productName TEXT NOT NULL,
  unit TEXT NOT NULL,
  actualReturnQuantity INTEGER NOT NULL DEFAULT 0,
  goodQuantity INTEGER NOT NULL DEFAULT 0,
  defectiveQuantity INTEGER NOT NULL DEFAULT 0,
  retrievalStatus INTEGER NOT NULL DEFAULT 0,
  retrievedGoodQuantity INTEGER NOT NULL DEFAULT 0,
  retrievedDefectiveQuantity INTEGER NOT NULL DEFAULT 0,
  entryUser TEXT NOT NULL,
  operators TEXT NOT NULL DEFAULT '[]',
  returnDate TEXT NOT NULL
);
```

### employees 表
```sql
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  employeeNumber TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  realName TEXT NOT NULL,
  loginCode TEXT NOT NULL UNIQUE,
  lastLoginTime TEXT
);
```

---

## 通用说明

1. **时间戳参数**: 所有 URL 都应添加 `t=${Date.now()}` 参数以防止浏览器缓存

2. **错误响应格式**:
```json
{
  "success": false,
  "data": null,
  "error": "错误信息"
}
```

3. **操作人记录**: `operators` 字段存储为 JSON 字符串数组，例如: `"[\"张三\", \"李四\", \"王五\"]"`

4. **日期格式**: 所有日期字段使用 `YYYY-MM-DD` 格式，例如: `"2026-01-20"`

5. **状态码说明**:
   - 配货状态: `0`=未配货, `1`=已配货, `3`=改配
   - 入库状态: `0`=未入库, `1`=已入库
   - 取回状态: `0`=未取回, `1`=已取回

6. **数据库位置**: 所有数据存储在 SQLite 数据库 `data/merchants.db` 中
