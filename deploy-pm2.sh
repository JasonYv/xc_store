#!/bin/bash

# 停止旧进程
pm2 delete merchant-management 2>/dev/null || true

# 清理缓存和构建文件
rm -rf .next
rm -rf node_modules/.cache

# 重新构建
npm run build

# 使用 ecosystem.config.js 启动
pm2 start ecosystem.config.js

# 保存配置
pm2 save --force 