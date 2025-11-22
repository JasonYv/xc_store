#!/bin/bash

# 停止旧进程
pm2 delete yc 2>/dev/null || true

# 清理缓存和构建文件
rm -rf .next
rm -rf node_modules/.cache

# 重新构建
npm run build

# 确保是生产环境
NODE_ENV=production PORT=3001 pm2 start npm --name "yc" -- start

# 保存配置
pm2 save --force 