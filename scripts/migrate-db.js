/**
 * 数据库迁移脚本
 * 用于在服务器上手动触发数据库迁移
 *
 * 使用方法：
 * node scripts/migrate-db.js
 */

const path = require('path');

// 设置环境变量，确保使用正确的路径
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

async function runMigration() {
  try {
    console.log('开始数据库迁移...');
    console.log('数据库路径:', path.join(process.cwd(), 'data/merchants.db'));

    // 动态导入数据库模块
    const { default: db } = await import('../src/lib/sqlite-db.ts');

    // 初始化数据库（会自动运行迁移）
    await db.init();

    console.log('✅ 数据库迁移成功完成！');
    console.log('');
    console.log('迁移内容：');
    console.log('- 检查并添加缺失的列');
    console.log('- 包括: pinduoduoShopId, sendOrderScreenshot, subAccount, pinduoduoPassword, cookie 等');

    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  }
}

runMigration();
