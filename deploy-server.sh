#!/bin/bash

# 本地构建
npm run build

# 打包文件（排除不需要的文件）
tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next/cache' \
    -czf dist.tar.gz .

# 上传到服务器
scp dist.tar.gz root@your-server:/www/wwwroot/admin.leapdeer.com/

# SSH 到服务器执行部署
ssh root@your-server "cd /www/wwwroot/admin.leapdeer.com && \
    tar xzf dist.tar.gz && \
    npm install --production && \
    ./deploy-pm2.sh && \
    rm dist.tar.gz"

# 删除本地打包文件
rm dist.tar.gz 