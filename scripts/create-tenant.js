#!/usr/bin/env node
/**
 * 租户管理（命令行）
 *
 * 为什么是脚本而不是后台页面：现有的 /dashboard 是你们自用的，这次刻意不动它
 * （见 docs 里多租户那节：只把「对外那半」做实）。开租户是低频动作，一条命令
 * 足够，也避免顺手把内部后台的入口扩大。
 *
 * 用法：
 *   # 开一家新公司（会打印远程配置令牌，只打这一次）
 *   node scripts/create-tenant.js --name "某某商贸有限公司" --contact "张三 138xxxx"
 *       --username admin --password '至少8位' --display-name "张三"
 *
 *   # 看所有租户
 *   node scripts/create-tenant.js --list
 *
 *   # 停用 / 启用
 *   node scripts/create-tenant.js --disable <tenantId>
 *   node scripts/create-tenant.js --enable  <tenantId>
 *
 *   # 换令牌（旧令牌立刻失效，桌面端要重新填地址）
 *   node scripts/create-tenant.js --rotate-token <tenantId>
 *
 *   # 删租户（连带账号、映射表、会话；不加 --yes 只预览不删）
 *   node scripts/create-tenant.js --delete <tenantId>
 *   node scripts/create-tenant.js --delete <tenantId> --yes
 *
 * 密码哈希格式必须和 src/lib/tenant-auth.ts 一致：scrypt$<saltHex>$<hashHex>，
 * keylen 64。改那边的话这里也要改，否则脚本建的账号登不进去。
 */
const crypto = require('crypto');
const path = require('path');
const sqlite3 = require('sqlite3');

const DB_PATH = path.join(process.cwd(), 'data', 'merchants.db');
const SCRYPT_KEYLEN = 64;

// ==================== 参数解析 ====================
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

// ==================== 与 tenant-auth.ts 对齐的工具 ====================
function hashTenantPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function newTenantToken() {
  return `ys_${crypto.randomBytes(24).toString('hex')}`;
}

function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

// ==================== 数据库 ====================
function openDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, err => (err ? reject(err) : resolve(db)));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onDone(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

/**
 * 确认租户那几张表在。脚本可能跑在任何一次请求之前（比如全新部署），
 * 这时表还不存在——给出明确提示，而不是抛一句 SQLITE_ERROR: no such table。
 */
async function assertSchema(db) {
  const row = await get(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tenants'"
  );
  if (!row) {
    console.error('找不到 tenants 表。请先把新版代码部署起来、让应用启动过一次');
    console.error('（Next 启动时会在 init() 里建表），再运行这个脚本。');
    process.exit(1);
  }
}

function printRemoteUrl(token) {
  const host = process.env.TENANT_HOST || 'https://v1.leapdeer.com';
  console.log('');
  console.log('  远程映射表地址（填到「商家版」工具的「远程映射表地址」里）：');
  console.log(`    ${host.replace(/\/$/, '')}/api/ys/${token}`);
  console.log('');
}

// ==================== 子命令 ====================
async function listTenants(db) {
  const tenants = await all(
    db,
    `SELECT t.*, (SELECT COUNT(*) FROM tenant_users u WHERE u.tenantId = t.id) AS userCount,
                  (SELECT COUNT(*) FROM product_mappings m WHERE m.tenantId = t.id) AS mappingCount
       FROM tenants t ORDER BY t.createdAt DESC`
  );

  if (tenants.length === 0) {
    console.log('还没有租户。用 --name 开一个。');
    return;
  }

  console.log(`共 ${tenants.length} 个租户：\n`);
  for (const t of tenants) {
    console.log(`  ${t.name}`);
    console.log(`    id       : ${t.id}`);
    console.log(`    状态     : ${t.status ? '启用' : '已停用'}`);
    console.log(`    联系人   : ${t.contact || '（未填）'}`);
    console.log(`    账号/映射: ${t.userCount} 个账号 / ${t.mappingCount} 行映射`);
    console.log(`    令牌     : ${t.token.slice(0, 12)}…（用 --rotate-token ${t.id} 可重置）`);
    console.log('');
  }
}

async function createTenant(db, args) {
  const name = String(args.name || '').trim();
  if (!name) {
    console.error('必须给 --name（公司名）');
    process.exit(1);
  }

  const username = String(args.username || '').trim();
  const password = String(args.password || '');
  const displayName = String(args['display-name'] || username).trim();

  // 账号是**可选**的：有些客户先把映射表灌进去、账号回头再开
  if (username) {
    if (password.length < 8) {
      console.error('--password 至少 8 位');
      process.exit(1);
    }
    const taken = await get(db, 'SELECT id FROM tenant_users WHERE username = ?', [username]);
    if (taken) {
      console.error(`登录名 ${username} 已被占用（登录名必须全局唯一）`);
      process.exit(1);
    }
  }

  const tenantId = newId();
  const token = newTenantToken();
  const now = new Date().toISOString();

  await run(
    db,
    `INSERT INTO tenants (id, createdAt, name, contact, status, token, tokenCreatedAt, remark)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    [tenantId, now, name, String(args.contact || '').trim(), token, now, String(args.remark || '').trim()]
  );

  let userId = '';
  if (username) {
    userId = newId();
    await run(
      db,
      `INSERT INTO tenant_users
         (id, tenantId, createdAt, username, password, displayName, role, isActive)
       VALUES (?, ?, ?, ?, ?, ?, 'owner', 1)`,
      [userId, tenantId, now, username, hashTenantPassword(password), displayName]
    );
  }

  console.log(`已创建租户「${name}」`);
  console.log(`  租户 id  : ${tenantId}`);
  if (username) {
    console.log(`  管理员   : ${username}（角色 owner）`);
  } else {
    console.log('  管理员   : （未创建，可用 --username/--password 再跑一次，或稍后补）');
  }
  printRemoteUrl(token);
  console.log('  令牌只在这里完整打印一次，请现在存下来（之后可用 --rotate-token 重置）。');
}

async function setStatus(db, id, status) {
  const tenant = await get(db, 'SELECT name FROM tenants WHERE id = ?', [id]);
  if (!tenant) {
    console.error(`找不到租户 ${id}`);
    process.exit(1);
  }
  await run(db, 'UPDATE tenants SET status = ? WHERE id = ?', [status ? 1 : 0, id]);
  if (!status) {
    // 停用要立刻生效：把该租户的会话全踢掉
    const result = await run(db, 'DELETE FROM tenant_sessions WHERE tenantId = ?', [id]);
    console.log(`已停用「${tenant.name}」（同时清掉了 ${result.changes || 0} 个登录会话）`);
    console.log('桌面端下次拉取会拿到 403。');
  } else {
    console.log(`已启用「${tenant.name}」`);
  }
}

async function rotateToken(db, id) {
  const tenant = await get(db, 'SELECT name, token FROM tenants WHERE id = ?', [id]);
  if (!tenant) {
    console.error(`找不到租户 ${id}`);
    process.exit(1);
  }
  const token = newTenantToken();
  await run(
    db,
    'UPDATE tenants SET token = ?, tokenCreatedAt = ? WHERE id = ?',
    [token, new Date().toISOString(), id]
  );
  console.log(`已重置「${tenant.name}」的令牌（旧令牌立即失效）`);
  console.log(`  旧：${tenant.token.slice(0, 12)}…`);
  printRemoteUrl(token);
}

async function deleteTenant(db, id, confirmed) {
  const tenant = await get(db, 'SELECT name FROM tenants WHERE id = ?', [id]);
  if (!tenant) {
    console.error(`找不到租户 ${id}`);
    process.exit(1);
  }

  const users = await get(db, 'SELECT COUNT(*) AS n FROM tenant_users WHERE tenantId = ?', [id]);
  const mappings = await get(db, 'SELECT COUNT(*) AS n FROM product_mappings WHERE tenantId = ?', [id]);

  if (!confirmed) {
    // 删除是不可逆的，而且会连带删掉映射表——所以要求显式加 --yes
    console.log(`将要删除租户「${tenant.name}」（id ${id}）：`);
    console.log(`  · ${users.n} 个控制台账号`);
    console.log(`  · ${mappings.n} 行商品映射`);
    console.log(`  · 该租户的全部登录会话`);
    console.log('');
    console.log('确认无误请加 --yes 重跑：');
    console.log(`  node scripts/create-tenant.js --delete ${id} --yes`);
    return;
  }

  await run(db, 'DELETE FROM tenant_sessions WHERE tenantId = ?', [id]);
  await run(db, 'DELETE FROM product_mappings WHERE tenantId = ?', [id]);
  await run(db, 'DELETE FROM tenant_users WHERE tenantId = ?', [id]);
  await run(db, 'DELETE FROM tenants WHERE id = ?', [id]);
  console.log(
    `已删除「${tenant.name}」：${users.n} 个账号、${mappings.n} 行映射、全部会话`
  );
  console.log('它的远程地址现在返回 404，桌面端会回落到缓存或本地映射表。');
}

// ==================== 入口 ====================
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = await openDb();

  try {
    await assertSchema(db);

    if (args.list) return await listTenants(db);

    if (args.disable) return await setStatus(db, String(args.disable), false);
    if (args.enable) return await setStatus(db, String(args.enable), true);
    if (args['rotate-token']) return await rotateToken(db, String(args['rotate-token']));
    if (args.delete) return await deleteTenant(db, String(args.delete), !!args.yes);

    if (args.name) return await createTenant(db, args);

    console.log('用法：');
    console.log('  node scripts/create-tenant.js --name "公司名" [--contact "张三 138xxxx"]');
    console.log('       [--username admin --password 至少8位 --display-name 张三]');
    console.log('  node scripts/create-tenant.js --list');
    console.log('  node scripts/create-tenant.js --disable <tenantId> | --enable <tenantId>');
    console.log('  node scripts/create-tenant.js --rotate-token <tenantId>');
    console.log('  node scripts/create-tenant.js --delete <tenantId> [--yes]   # 不加 --yes 只预览');
    console.log('');
    console.log('  可选环境变量：TENANT_HOST（默认 https://v1.leapdeer.com）用于打印远程地址');
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('执行失败:', error.message);
  process.exit(1);
});
