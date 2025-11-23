#!/usr/bin/env node

/**
 * 从旧数据库迁移商家数据到新数据库
 *
 * 旧数据库字段:
 * - id, createdAt, name, warehouse1, warehouse2, defaultWarehouse, groupName, sendMessage
 *
 * 新数据库字段:
 * - id, createdAt, name, merchantId, pinduoduoName, warehouse1, groupName, sendMessage,
 *   mentionList, subAccount, pinduoduoPassword, cookie, pinduoduoShopId, sendOrderScreenshot
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const OLD_DB_PATH = path.join(__dirname, '../data/merchants_bak.db');
const NEW_DB_PATH = path.join(__dirname, '../data/merchants.db');

console.log('开始数据迁移...');
console.log('旧数据库:', OLD_DB_PATH);
console.log('新数据库:', NEW_DB_PATH);

// 打开旧数据库
const oldDb = new sqlite3.Database(OLD_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('无法打开旧数据库:', err.message);
    process.exit(1);
  }
  console.log('✓ 已连接到旧数据库');
});

// 打开新数据库
const newDb = new sqlite3.Database(NEW_DB_PATH, (err) => {
  if (err) {
    console.error('无法打开新数据库:', err.message);
    process.exit(1);
  }
  console.log('✓ 已连接到新数据库');
});

// 从旧数据库读取所有商家
oldDb.all('SELECT * FROM merchants', [], (err, oldMerchants) => {
  if (err) {
    console.error('读取旧数据库失败:', err.message);
    oldDb.close();
    newDb.close();
    process.exit(1);
  }

  console.log(`\n从旧数据库读取到 ${oldMerchants.length} 条商家数据`);

  // 从新数据库读取已存在的商家ID
  newDb.all('SELECT id FROM merchants', [], (err, existingMerchants) => {
    if (err) {
      console.error('读取新数据库失败:', err.message);
      oldDb.close();
      newDb.close();
      process.exit(1);
    }

    const existingIds = new Set(existingMerchants.map(m => m.id));
    console.log(`新数据库已有 ${existingIds.size} 条商家数据`);

    // 过滤出需要迁移的商家
    const merchantsToMigrate = oldMerchants.filter(m => !existingIds.has(m.id));

    if (merchantsToMigrate.length === 0) {
      console.log('\n✓ 所有商家数据已存在,无需迁移');
      oldDb.close();
      newDb.close();
      return;
    }

    console.log(`\n需要迁移 ${merchantsToMigrate.length} 条新数据:`);

    // 准备插入语句
    const insertStmt = newDb.prepare(`
      INSERT INTO merchants (
        id, createdAt, name, merchantId, pinduoduoName, warehouse1, groupName,
        sendMessage, mentionList, subAccount, pinduoduoPassword, cookie,
        pinduoduoShopId, sendOrderScreenshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let successCount = 0;
    let errorCount = 0;

    // 开始事务
    newDb.run('BEGIN TRANSACTION');

    merchantsToMigrate.forEach((merchant, index) => {
      // 映射字段
      // 旧字段: warehouse1, warehouse2, defaultWarehouse
      // 新字段: warehouse1 (只保留一个仓库字段)

      insertStmt.run([
        merchant.id,
        merchant.createdAt,
        merchant.name,
        '', // merchantId - 新字段,默认空
        '', // pinduoduoName - 新字段,默认空
        merchant.warehouse1, // 使用旧的 warehouse1
        merchant.groupName,
        merchant.sendMessage || 0,
        '[]', // mentionList - 新字段,默认空数组
        '', // subAccount - 新字段,默认空
        '', // pinduoduoPassword - 新字段,默认空
        '', // cookie - 新字段,默认空
        '', // pinduoduoShopId - 新字段,默认空
        0  // sendOrderScreenshot - 新字段,默认关闭
      ], (err) => {
        if (err) {
          console.error(`  ✗ [${index + 1}/${merchantsToMigrate.length}] 迁移失败: ${merchant.name} (${merchant.id})`, err.message);
          errorCount++;
        } else {
          console.log(`  ✓ [${index + 1}/${merchantsToMigrate.length}] 已迁移: ${merchant.name}`);
          successCount++;
        }

        // 最后一条数据处理完毕
        if (index === merchantsToMigrate.length - 1) {
          insertStmt.finalize();

          // 提交事务
          newDb.run('COMMIT', (err) => {
            if (err) {
              console.error('\n提交事务失败:', err.message);
              newDb.run('ROLLBACK');
              oldDb.close();
              newDb.close();
              process.exit(1);
            }

            console.log('\n========================================');
            console.log('迁移完成!');
            console.log(`✓ 成功迁移: ${successCount} 条`);
            if (errorCount > 0) {
              console.log(`✗ 失败: ${errorCount} 条`);
            }
            console.log('========================================\n');

            // 验证迁移结果
            newDb.get('SELECT COUNT(*) as count FROM merchants', [], (err, row) => {
              if (!err) {
                console.log(`新数据库现有商家总数: ${row.count}\n`);
              }

              oldDb.close();
              newDb.close();
            });
          });
        }
      });
    });
  });
});
