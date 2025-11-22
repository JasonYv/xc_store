#!/bin/bash

# 安装依赖
npm install

# 构建项目
npm run build

# 设置环境变量
export PORT=3001  # 或者你想要的端口号

# 启动服务
npm run start 