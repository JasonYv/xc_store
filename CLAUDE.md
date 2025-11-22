# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 14 的商家管理系统,使用 TypeScript + React + Tailwind CSS 构建。项目采用 Pages Router 架构,并使用 SQLite 作为数据库存储。

## 开发命令

```bash
# 开发模式 (默认端口 3000)
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器 (端口由 PORT 环境变量控制,默认 3001)
npm run start

# 代码检查
npm run lint

# 构建并导出静态文件
npm run export

# 部署 (构建 + 启动)
npm run deploy
```

## 核心架构

### 数据库架构

项目使用双数据库系统:

1. **SQLite 数据库** (`src/lib/sqlite-db.ts`) - 主要数据存储
   - 位置: `data/merchants.db`
   - 包含两个主表: `merchants` 和 `users`
   - 支持从 JSON 文件自动迁移数据
   - 默认管理员账号: `admin` / `19131421a..0`

2. **JSON 文件存储** (`src/lib/db.ts`) - 旧版兼容
   - 位置: `data/merchants.json`
   - 仅用于数据迁移,新功能应使用 SQLite

### 数据库初始化流程

每次 API 调用时都会:
1. 调用 `db.init()` 初始化 SQLite 数据库
2. 调用 `db.migrateFromJson()` 从 JSON 迁移数据(仅执行一次)
3. 在 `migration_info` 表中记录迁移状态

### 认证系统

- 使用 Next.js Middleware (`src/middleware.ts`) 进行路由保护
- 通过 Cookie `isAuthenticated` 判断登录状态
- 受保护路由: `/dashboard/*`
- 公开路由: `/` (登录页)
- 密码使用 SHA-256 哈希存储

### API 路由结构

**内部 API** (需认证):
- `POST /api/auth` - 用户登录
- `/api/merchants` - 商家 CRUD 操作 (GET, POST, PUT, DELETE)
- `/api/users` - 用户管理 (GET, POST, PUT, DELETE)
- `/api/merchants/send-message` - 发送企业微信消息

**公开 API** (需 API Key):
- `GET /api/public/merchants` - 获取启用消息通知的商家列表
- `POST /api/public/send-message` - 发送企业微信消息

API Key 配置在 `src/config/index.ts`,通过环境变量 `API_KEY` 或默认值控制。

### 第三方集成

企业微信消息推送:
- 配置文件: `src/config/api.ts`
- Robot ID: `wtr89taerr32z8miwin31fabnzdkzn83`
- API 端点: `https://api.worktool.ymdyes.cn/wework/sendRawMessage`

### 类型系统

核心类型定义在 `src/lib/types.ts`:
- `Merchant` - 商家信息(包含 id, createdAt, name, warehouse1/2, defaultWarehouse, groupName, sendMessage)
- `User` - 用户账号
- `ApiResponse<T>` - 标准 API 响应格式

### UI 组件库

使用 shadcn/ui 组件:
- 位置: `src/components/ui/`
- 包含: Button, Card, Dialog, Input, Table, Switch, Toast, Pagination
- 样式工具: `clsx` + `tailwind-merge` (通过 `src/lib/utils.ts` 的 `cn()` 函数)

### 页面结构

```
/                          - 登录页面
/dashboard                 - 仪表板概览
/dashboard/merchants       - 商家管理
/dashboard/users           - 用户管理
/dashboard/settings        - 系统设置
```

## 开发注意事项

### 数据库操作

- **始终使用 SQLite 数据库** (`src/lib/sqlite-db.ts`) 进行新功能开发
- 不要直接修改 JSON 文件数据库 (`src/lib/db.ts`)
- API 路由必须先调用 `await db.init()` 和 `await db.migrateFromJson()`

### 接口封装规范

根据用户全局配置,所有 API 请求 URL 必须添加时间戳参数以防止缓存:
- 无参数 URL: `${url}?t=${Date.now()}`
- 有参数 URL: `${url}&t=${Date.now()}`

### 布尔值存储

SQLite 使用 INTEGER (0/1) 存储布尔值:
- 存储时: `boolean ? 1 : 0`
- 读取时: `!!value`

### 敏感信息

- 数据库密码使用 SHA-256 哈希
- API Key 应通过环境变量配置
- 企业微信配置在 `src/config/api.ts` 中硬编码(考虑迁移到环境变量)

### 样式规范

- 使用 Tailwind CSS 进行样式编写
- 使用 `cn()` 工具函数合并类名
- 响应式设计已集成

### 组件位置

- 通用组件: `src/components/common/`
- 布局组件: `src/components/layout/`
- 业务组件: `src/components/merchant/`, `src/components/dashboard/`, `src/components/settings/`
- UI 基础组件: `src/components/ui/`

## 测试和调试

- 测试页面: `/test-api` - 用于测试 API 端点
- 数据库文件: `data/merchants.db` (SQLite)
- 日志: 服务器端错误会输出到控制台

## 常见任务

### 添加新的 API 端点
1. 在 `src/pages/api/` 下创建文件
2. 导出 `handler` 函数(类型: `NextApiRequest, NextApiResponse`)
3. 调用 `db.init()` 初始化数据库
4. 实现业务逻辑
5. 返回标准 `ApiResponse` 格式

### 添加新的数据表
1. 在 `src/lib/types.ts` 定义 TypeScript 类型
2. 在 `SqliteDatabase.init()` 中添加 `CREATE TABLE` 语句
3. 在 `SqliteDatabase` 类中实现 CRUD 方法

### 修改用户认证
1. 默认管理员账号在 `src/lib/sqlite-db.ts` 的 `createDefaultAdmin()` 方法中定义
2. 密码哈希逻辑在 `hashPassword()` 方法中
3. 认证验证在 `/api/auth` 端点中
