#!/bin/bash

# 停止旧进程
pm2 delete merchant-management 2>/dev/null || true

# 安装依赖（如果 node_modules 不存在或有更新）
if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  npm install --production=false
fi

# 清理缓存和构建文件
rm -rf .next
rm -rf node_modules/.cache

# 重新构建
npm run build

# 检查 next 可执行文件是否存在
if [ ! -f "node_modules/.bin/next" ]; then
  echo "错误: 找不到 next 可执行文件"
  exit 1
fi

# 使用 ecosystem.config.js 启动
pm2 start ecosystem.config.js

# 保存配置
pm2 save --force 