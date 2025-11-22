export const CONFIG = {
  auth: {
    username: 'admin',
    password: 'admin123'
  },
  api: {
    key: process.env.API_KEY || 'your-default-api-key'  // 建议使用环境变量
  }
}; 