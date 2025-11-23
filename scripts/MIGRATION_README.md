# 数据库迁移说明

## 迁移概述

本次迁移将旧数据库 (`merchants_bak.db`) 中的商家数据迁移到新数据库 (`merchants.db`)。

## 数据库结构变化

### 旧数据库字段 (merchants_bak.db)

```sql
CREATE TABLE merchants (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  name TEXT NOT NULL,
  warehouse1 TEXT NOT NULL,
  warehouse2 TEXT NOT NULL,        -- 已移除
  defaultWarehouse TEXT NOT NULL,  -- 已移除
  groupName TEXT NOT NULL,
  sendMessage INTEGER DEFAULT 0
);
```

### 新数据库字段 (merchants.db)

```sql
CREATE TABLE merchants (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  name TEXT NOT NULL,
  merchantId TEXT NOT NULL DEFAULT '',           -- 新增: 多多买菜店铺ID
  pinduoduoName TEXT NOT NULL DEFAULT '',        -- 新增: 多多买菜店铺名称
  warehouse1 TEXT NOT NULL,
  groupName TEXT NOT NULL,
  sendMessage INTEGER DEFAULT 0,
  mentionList TEXT DEFAULT '[]',                 -- 新增: 艾特对象列表
  subAccount TEXT NOT NULL DEFAULT '',           -- 新增: 子账号
  pinduoduoPassword TEXT NOT NULL DEFAULT '',    -- 新增: 多多密码
  cookie TEXT NOT NULL DEFAULT '',               -- 新增: 登录Cookie
  pinduoduoShopId TEXT NOT NULL DEFAULT '',      -- 新增: 多多买菜店铺ID
  sendOrderScreenshot INTEGER DEFAULT 0          -- 新增: 是否发送订单截图
);
```

## 字段映射规则

| 旧字段 | 新字段 | 说明 |
|--------|--------|------|
| id | id | 保持不变 |
| createdAt | createdAt | 保持不变 |
| name | name | 保持不变 |
| - | merchantId | 新增,默认为空字符串 |
| - | pinduoduoName | 新增,默认为空字符串 |
| warehouse1 | warehouse1 | 保持不变 |
| warehouse2 | - | 已移除 |
| defaultWarehouse | - | 已移除 |
| groupName | groupName | 保持不变 |
| sendMessage | sendMessage | 保持不变 |
| - | mentionList | 新增,默认为 '[]' |
| - | subAccount | 新增,默认为空字符串 |
| - | pinduoduoPassword | 新增,默认为空字符串 |
| - | cookie | 新增,默认为空字符串 |
| - | pinduoduoShopId | 新增,默认为空字符串 |
| - | sendOrderScreenshot | 新增,默认为 0 (关闭) |

## 迁移结果

**执行时间**: 2025-11-23

**迁移统计**:
- 旧数据库商家总数: **69条**
- 新数据库原有商家: **34条**
- 本次迁移商家: **35条**
- 迁移成功: **35条**
- 迁移失败: **0条**
- 新数据库最终商家总数: **69条**

## 迁移的商家列表

以下商家从旧数据库迁移到新数据库:

1. 宏达纸品
2. 蒸蒸上食品
3. 鸿运实惠
4. 忆嗨家
5. 越盛商贸
6. 石上之林
7. 百家多
8. 枕头咖啡
9. 瑞程贸易
10. 晓风派
11. 新疆西域克拉滋补店
12. 豪诚优选
13. 新疆磊成峰新零售供应链
14. 九紫茶行
15. 粤东来
16. 海纳百川
17. 鼎易商贸
18. 桂妙食品
19. 精峰食品
20. 誉尚优品
21. 四川天府
22. 安驾商贸
23. 天天有糖
24. 远港百货
25. 俏丽友
26. 梦琰百货
27. 心相印
28. 米赛商贸
29. 咖点优品
30. 新疆米赛商贸
31. 东润好物
32. 优乐亿
33. 陇中元
34. 威哥供应链
35. 牛格格

## 如何再次运行迁移

如果需要重新迁移(例如清空新数据库后):

```bash
# 在项目根目录执行
node scripts/migrate-from-old-db.js
```

**注意**: 脚本会自动检测已存在的商家ID,避免重复迁移。

## 验证迁移结果

### 检查商家总数

```bash
sqlite3 data/merchants.db "SELECT COUNT(*) FROM merchants"
```

预期输出: `69`

### 查看新迁移的商家

```bash
sqlite3 data/merchants.db "SELECT name, warehouse1, groupName FROM merchants WHERE name='宏达纸品'"
```

### 检查新增字段

```bash
sqlite3 data/merchants.db "SELECT name, merchantId, pinduoduoShopId, sendOrderScreenshot FROM merchants LIMIT 5"
```

新迁移的商家这些字段应该为空或默认值。

## 迁移后的注意事项

1. **新增字段需要手动配置**:
   - 对于新迁移的商家,以下字段需要在管理后台手动配置:
     - `merchantId` (多多买菜店铺ID)
     - `pinduoduoName` (多多买菜店铺名称)
     - `subAccount` (子账号)
     - `pinduoduoPassword` (多多密码)
     - `pinduoduoShopId` (多多买菜店铺ID)
     - `mentionList` (艾特对象列表)
     - `sendOrderScreenshot` (是否发送订单截图)

2. **数据备份**:
   - 旧数据库已保存在 `data/merchants_bak.db`
   - 请勿删除此文件,以备后续需要

3. **功能测试**:
   - 迁移后请在管理后台检查所有商家是否显示正常
   - 测试商家的新增、编辑、删除功能
   - 测试发送消息功能是否正常

## 后续清理

迁移成功并验证无误后,可以考虑:

1. 保留 `merchants_bak.db` 作为备份
2. 定期备份 `merchants.db`
3. 如有需要,可以删除 `merchants-backup.db` (空文件)

## 脚本文件

迁移脚本位置: `scripts/migrate-from-old-db.js`
