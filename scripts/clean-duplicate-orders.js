/**
 * 清理重复订单数据脚本
 *
 * 功能:
 * 1. 检查数据库中是否存在重复的订单数据
 * 2. 对于重复的订单(相同的 shopId + productId + salesDate),保留 id 最大(最新)的记录
 * 3. 删除其他旧的重复记录
 *
 * 使用方法:
 * node scripts/clean-duplicate-orders.js
 *
 * 参数:
 * --dry-run  只检查不删除,仅显示会被删除的记录
 * --force    强制执行,不需要确认
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// 数据库路径
const DB_PATH = path.join(__dirname, '../data/merchants.db');

// 检查命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

async function main() {
  console.log('============================================');
  console.log('订单数据重复清理脚本');
  console.log('============================================\n');

  if (isDryRun) {
    console.log('⚠️  运行模式: 仅检查 (--dry-run)\n');
  } else if (isForce) {
    console.log('⚠️  运行模式: 强制执行 (--force)\n');
  } else {
    console.log('运行模式: 交互式\n');
  }

  // 打开数据库连接
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  try {
    // 1. 检查是否存在 product_sales_orders 表
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='product_sales_orders'"
    );

    if (!tableExists) {
      console.log('❌ 未找到 product_sales_orders 表');
      return;
    }

    // 2. 查找重复的订单
    console.log('正在检查重复订单...\n');

    const duplicates = await db.all(`
      SELECT shopId, productId, salesDate, COUNT(*) as count
      FROM product_sales_orders
      GROUP BY shopId, productId, salesDate
      HAVING count > 1
    `);

    if (duplicates.length === 0) {
      console.log('✅ 未发现重复的订单数据,数据库状态良好!');
      return;
    }

    console.log(`⚠️  发现 ${duplicates.length} 组重复的订单数据:\n`);

    // 3. 显示重复数据详情
    let totalDuplicateRecords = 0;
    const detailsToDelete = [];

    for (const [index, dup] of duplicates.entries()) {
      const { shopId, productId, salesDate, count } = dup;

      // 获取这组重复数据的所有记录
      const records = await db.all(
        `SELECT id, createdAt, updatedAt, shopName, productName, salesQuantity
         FROM product_sales_orders
         WHERE shopId = ? AND productId = ? AND salesDate = ?
         ORDER BY id DESC`,
        shopId,
        productId,
        salesDate
      );

      console.log(`${index + 1}. 重复组:`);
      console.log(`   - 店铺ID: ${shopId}`);
      console.log(`   - 商品ID: ${productId}`);
      console.log(`   - 销售日期: ${salesDate}`);
      console.log(`   - 重复数量: ${count} 条记录\n`);

      console.log('   记录详情:');
      records.forEach((record, i) => {
        const status = i === 0 ? '✅ 保留' : '❌ 删除';
        console.log(`     ${status} | ID: ${record.id} | 创建: ${record.createdAt} | 数量: ${record.salesQuantity}`);
      });
      console.log('');

      // 记录要删除的记录
      if (records.length > 1) {
        const toDelete = records.slice(1);
        detailsToDelete.push({
          shopId,
          productId,
          salesDate,
          keepId: records[0].id,
          deleteIds: toDelete.map(r => r.id)
        });
        totalDuplicateRecords += toDelete.length;
      }
    }

    console.log(`\n总结:`);
    console.log(`- 发现 ${duplicates.length} 组重复数据`);
    console.log(`- 将删除 ${totalDuplicateRecords} 条旧记录`);
    console.log(`- 将保留 ${duplicates.length} 条最新记录\n`);

    // 4. 如果是 dry-run,到此结束
    if (isDryRun) {
      console.log('ℹ️  这是一次试运行,未执行任何删除操作');
      console.log('如需执行清理,请运行: node scripts/clean-duplicate-orders.js');
      return;
    }

    // 5. 请求用户确认(除非使用 --force)
    if (!isForce) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('是否继续执行清理? (输入 yes 确认): ', resolve);
      });

      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ 已取消清理操作');
        return;
      }
    }

    // 6. 执行删除操作
    console.log('\n开始清理重复数据...\n');

    await db.exec('BEGIN TRANSACTION');

    try {
      let deletedCount = 0;

      for (const item of detailsToDelete) {
        for (const idToDelete of item.deleteIds) {
          await db.run(
            'DELETE FROM product_sales_orders WHERE id = ?',
            idToDelete
          );
          deletedCount++;
        }

        console.log(
          `✓ 清理完成: shopId=${item.shopId}, productId=${item.productId}, salesDate=${item.salesDate}, 删除 ${item.deleteIds.length} 条`
        );
      }

      await db.exec('COMMIT');

      console.log(`\n✅ 清理完成! 共删除 ${deletedCount} 条重复记录\n`);

      // 7. 验证清理结果
      const remainingDuplicates = await db.all(`
        SELECT COUNT(*) as count
        FROM product_sales_orders
        GROUP BY shopId, productId, salesDate
        HAVING count > 1
      `);

      if (remainingDuplicates.length === 0) {
        console.log('✅ 验证通过: 数据库中已无重复数据');
      } else {
        console.log(`⚠️  警告: 仍有 ${remainingDuplicates.length} 组重复数据`);
      }

    } catch (error) {
      await db.exec('ROLLBACK');
      console.error('\n❌ 清理失败,已回滚所有更改');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error);
  } finally {
    await db.close();
  }
}

// 运行脚本
main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
