/**
 * 从JSON数据迁移到SQLite数据库
 * 
 * 使用方法:
 * node scripts/migrate-to-sqlite.js
 */

// 使用源代码路径
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// 设置数据路径
const DB_PATH = path.join(process.cwd(), 'data/merchants.db');
const JSON_PATH = path.join(process.cwd(), 'data/merchants.json');

// 直接在脚本中实现迁移逻辑，避免导入TypeScript文件
async function migrateData() {
  console.log('开始迁移数据从JSON到SQLite...');
  
  // 确保数据目录存在
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 打开数据库连接
  const db = new sqlite3.Database(DB_PATH);
  
  // 将callback API转换为promise
  const run = (sql, ...params) => new Promise((resolve, reject) => {
    db.run(sql, ...params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
  
  const get = (sql, ...params) => new Promise((resolve, reject) => {
    db.get(sql, ...params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
  const all = (sql, ...params) => new Promise((resolve, reject) => {
    db.all(sql, ...params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  try {
    // 创建merchants表
    await run(`
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL,
        name TEXT NOT NULL,
        warehouse1 TEXT NOT NULL,
        warehouse2 TEXT NOT NULL,
        defaultWarehouse TEXT NOT NULL,
        groupName TEXT NOT NULL,
        sendMessage INTEGER DEFAULT 0
      )
    `);
    
    // 创建迁移信息表
    await run(`
      CREATE TABLE IF NOT EXISTS migration_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migrated_at TEXT NOT NULL,
        source TEXT NOT NULL
      )
    `);
    
    // 检查是否已迁移
    const migrationRecord = await get('SELECT * FROM migration_info WHERE source = ?', 'json_to_sqlite');
    if (migrationRecord) {
      console.log(`已经完成过迁移，时间: ${migrationRecord.migrated_at}`);
      db.close();
      return;
    }
    
    // 检查JSON文件
    if (!fs.existsSync(JSON_PATH)) {
      console.log('JSON文件不存在，无需迁移');
      db.close();
      return;
    }
    
    // 读取JSON数据
    const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    const merchants = jsonData.merchants || [];
    
    // 开始事务
    await run('BEGIN TRANSACTION');
    
    // 检查表是否为空
    const count = await get('SELECT COUNT(*) as count FROM merchants');
    if (count.count > 0) {
      console.log('SQLite数据库已有数据，跳过迁移');
      await run('COMMIT');
      db.close();
      return;
    }
    
    // 插入数据
    for (const merchant of merchants) {
      await run(
        `INSERT INTO merchants (id, createdAt, name, warehouse1, warehouse2, defaultWarehouse, groupName, sendMessage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        merchant.id,
        merchant.createdAt,
        merchant.name,
        merchant.warehouse1,
        merchant.warehouse2,
        merchant.defaultWarehouse,
        merchant.groupName,
        merchant.sendMessage ? 1 : 0
      );
    }
    
    // 记录迁移状态
    await run(
      'INSERT INTO migration_info (migrated_at, source) VALUES (?, ?)',
      new Date().toISOString(),
      'json_to_sqlite'
    );
    
    // 提交事务
    await run('COMMIT');
    
    // 验证数据
    const jsonCount = merchants.length;
    const sqliteCount = await get('SELECT COUNT(*) as count FROM merchants');
    
    console.log(`JSON数据数量: ${jsonCount}`);
    console.log(`SQLite数据数量: ${sqliteCount.count}`);
    
    if (jsonCount === sqliteCount.count) {
      console.log('✅ 数据迁移成功，数量匹配');
    } else {
      console.log('⚠️ 数据迁移完成，但数量不匹配，请检查');
    }
  } catch (err) {
    console.error('迁移过程中发生错误:', err);
    await run('ROLLBACK').catch(() => {});
  } finally {
    // 关闭数据库连接
    db.close();
    console.log('数据库连接已关闭');
  }
}

migrateData(); 