module.exports = {
  apps: [{
    name: 'merchant-management',
    cwd: '/www/wwwroot/admin.leapdeer.com',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      API_KEY: 'n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'admin123'
    },
    interpreter: '/www/server/nodejs/v20.10.0/bin/node',
    error_file: '/www/wwwlogs/merchant-management-error.log',
    out_file: '/www/wwwlogs/merchant-management-out.log',
    log_file: '/www/wwwlogs/merchant-management-combined.log',
    time: true,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
} 