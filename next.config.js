/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  env: {
    API_KEY: process.env.API_KEY,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  },
  reactStrictMode: true,
  // 启用 instrumentation.ts（Next 14 需显式开启），用于服务端日志加时间戳
  experimental: {
    instrumentationHook: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // APP 安装包走接口下发，才能带上正确的 Content-Type
  // （public/ 静态托管只会回 octet-stream，iOS 不会弹描述文件安装）。
  // beforeFiles 保证即使 public/app/ 下有同名文件也优先命中接口。
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/app/xc.apk', destination: '/api/app/download?target=android' },
        { source: '/app/xc.mobileconfig', destination: '/api/app/download?target=ios' },
      ],
    };
  },
}

module.exports = nextConfig 