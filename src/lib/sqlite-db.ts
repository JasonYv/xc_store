import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { Merchant, User, Product, ProductSalesOrder, DailyDelivery, ReturnDetail, Employee, OperationLog, OperationLogFormData } from './types';
import crypto from 'crypto';
import { PaginationHelper, PaginationParams, PaginationResult, QueryBuilder } from './pagination';

export class SqliteDatabase {
  private db: SQLiteDatabase | null = null;
  private initialized: boolean = false;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data/merchants.db');
    // 确保数据目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async init() {
    if (this.initialized) return;

    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // 创建merchants表
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS merchants (
          id TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL,
          name TEXT NOT NULL,
          merchantId TEXT NOT NULL DEFAULT '',
          pinduoduoName TEXT NOT NULL DEFAULT '',
          warehouse1 TEXT NOT NULL,
          groupName TEXT NOT NULL,
          sendMessage INTEGER DEFAULT 0,
          mentionList TEXT DEFAULT '[]'
        )
      `);

      // 创建users表
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          displayName TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          isActive INTEGER DEFAULT 1
        )
      `);

      // 创建products表
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL,
          pinduoduoProductId TEXT NOT NULL DEFAULT '',
          pinduoduoProductImage TEXT NOT NULL DEFAULT '',
          productName TEXT NOT NULL,
          pinduoduoProductName TEXT NOT NULL DEFAULT '',
          merchantId TEXT NOT NULL,
          FOREIGN KEY (merchantId) REFERENCES merchants(id) ON DELETE CASCADE
        )
      `);

      // 创建product_sales_orders表
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS product_sales_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          createdAt TEXT NOT NULL,
          shopName TEXT NOT NULL,
          shopId TEXT NOT NULL,
          productId TEXT NOT NULL,
          productName TEXT NOT NULL,
          productImage TEXT NOT NULL DEFAULT '',
          salesArea TEXT NOT NULL,
          warehouseInfo TEXT NOT NULL,
          salesDate TEXT NOT NULL,
          salesSpec TEXT NOT NULL,
          totalStock INTEGER NOT NULL DEFAULT 0,
          estimatedSales INTEGER NOT NULL DEFAULT 0,
          totalSales INTEGER NOT NULL DEFAULT 0,
          salesQuantity INTEGER NOT NULL DEFAULT 0,
          UNIQUE(shopId, productId, salesDate)
        )
      `);

      // 创建settings表
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);

      // 创建daily_deliveries表（当日送货）
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS daily_deliveries (
          id TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL,
          merchantName TEXT NOT NULL,
          productName TEXT NOT NULL,
          unit TEXT NOT NULL,
          dispatchQuantity INTEGER NOT NULL DEFAULT 0,
          estimatedSales INTEGER NOT NULL DEFAULT 0,
          surplusQuantity INTEGER NOT NULL DEFAULT 0,
          distributionStatus INTEGER NOT NULL DEFAULT 0,
          warehousingStatus INTEGER NOT NULL DEFAULT 0,
          entryUser TEXT NOT NULL,
          operators TEXT NOT NULL DEFAULT '[]',
          deliveryDate TEXT NOT NULL
        )
      `);

      // 迁移：为现有表添加 surplusQuantity 字段
      try {
        await this.db.exec(`ALTER TABLE daily_deliveries ADD COLUMN surplusQuantity INTEGER NOT NULL DEFAULT 0`);
      } catch (e) {
        // 字段已存在，忽略错误
      }

      // 迁移：为现有表添加 dataType 字段（0=余货, 1=客退）
      try {
        await this.db.exec(`ALTER TABLE daily_deliveries ADD COLUMN dataType INTEGER NOT NULL DEFAULT 0`);
      } catch (e) {
        // 字段已存在，忽略错误
      }

      // 创建daily_deliveries索引
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_deliveries_date ON daily_deliveries(deliveryDate);
        CREATE INDEX IF NOT EXISTS idx_daily_deliveries_merchant ON daily_deliveries(merchantName);
        CREATE INDEX IF NOT EXISTS idx_daily_deliveries_product ON daily_deliveries(productName);
        CREATE INDEX IF NOT EXISTS idx_daily_deliveries_status ON daily_deliveries(distributionStatus, warehousingStatus);
      `);

      // 创建return_details表（余货/客退明细）
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS return_details (
          id TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL,
          merchantName TEXT NOT NULL,
          productName TEXT NOT NULL,
          unit TEXT NOT NULL,
          actualReturnQuantity INTEGER NOT NULL DEFAULT 0,
          goodQuantity INTEGER NOT NULL DEFAULT 0,
          defectiveQuantity INTEGER NOT NULL DEFAULT 0,
          retrievalStatus INTEGER NOT NULL DEFAULT 0,
          retrievedGoodQuantity INTEGER NOT NULL DEFAULT 0,
          retrievedDefectiveQuantity INTEGER NOT NULL DEFAULT 0,
          entryUser TEXT NOT NULL,
          operators TEXT NOT NULL DEFAULT '[]',
          returnDate TEXT NOT NULL
        )
      `);

      // 迁移：为现有表添加 dataType 字段（0=余货, 1=客退）
      try {
        await this.db.exec(`ALTER TABLE return_details ADD COLUMN dataType INTEGER NOT NULL DEFAULT 0`);
      } catch (e) {
        // 字段已存在，忽略错误
      }

      // 创建return_details索引
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_return_details_date ON return_details(returnDate);
        CREATE INDEX IF NOT EXISTS idx_return_details_merchant ON return_details(merchantName);
        CREATE INDEX IF NOT EXISTS idx_return_details_product ON return_details(productName);
        CREATE INDEX IF NOT EXISTS idx_return_details_status ON return_details(retrievalStatus);
      `);

      // 创建employees表（员工表）
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS employees (
          id TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL,
          employeeNumber TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          realName TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          password TEXT NOT NULL DEFAULT '',
          loginCode TEXT NOT NULL UNIQUE,
          lastLoginTime TEXT
        )
      `);

      // 创建operation_logs表（操作日志表）
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS operation_logs (
          id TEXT PRIMARY KEY,
          createdAt TEXT NOT NULL,
          targetTable TEXT NOT NULL,
          targetId TEXT NOT NULL,
          action TEXT NOT NULL,
          operatorType TEXT NOT NULL,
          operatorId TEXT NOT NULL,
          operatorName TEXT NOT NULL,
          fieldName TEXT,
          oldValue TEXT,
          newValue TEXT,
          changeDetail TEXT,
          remark TEXT
        )
      `);

      // 创建operation_logs索引
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_operation_logs_target ON operation_logs(targetTable, targetId);
        CREATE INDEX IF NOT EXISTS idx_operation_logs_operator ON operation_logs(operatorType, operatorId);
        CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
        CREATE INDEX IF NOT EXISTS idx_operation_logs_date ON operation_logs(createdAt);
      `);

      // 检查是否需要创建默认设置
      const settingsCount = await this.db.get(
        'SELECT COUNT(*) as count FROM settings'
      );

      if (settingsCount.count === 0) {
        // 创建默认设置，包括 API Key
        await this.createDefaultSettings();
      }

      // 检查是否需要创建默认管理员账号
      const adminExists = await this.db.get(
        'SELECT COUNT(*) as count FROM users'
      );

      if (adminExists.count === 0) {
        // 创建默认管理员账号
        await this.createDefaultAdmin();
      }

      // 数据库迁移：为现有表添加新列
      await this.migrateAddColumns();

      // 数据库迁移：为订单表添加唯一索引
      await this.migrateAddUniqueIndex();

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      throw error;
    }
  }

  // 创建默认设置
  private async createDefaultSettings() {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const defaultSettings = [
      { key: 'apiKey', value: 'n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4', updatedAt: now },
      { key: 'systemLogs', value: 'true', updatedAt: now },
      { key: 'multiLogin', value: 'true', updatedAt: now }
    ];

    for (const setting of defaultSettings) {
      await this.db.run(
        `INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?)`,
        setting.key,
        setting.value,
        setting.updatedAt
      );
    }
  }

  // 创建默认管理员账号
  private async createDefaultAdmin() {
    if (!this.db) throw new Error('Database not initialized');

    const defaultAdmin = {
      id: crypto.randomUUID(),
      username: 'admin',
      // 加盐哈希密码
      password: this.hashPassword('19131421a..0'),
      displayName: '系统管理员',
      createdAt: new Date().toISOString(),
      isActive: 1
    };

    await this.db.run(
      `INSERT INTO users (id, username, password, displayName, createdAt, isActive)
       VALUES (?, ?, ?, ?, ?, ?)`,
      defaultAdmin.id,
      defaultAdmin.username,
      defaultAdmin.password,
      defaultAdmin.displayName,
      defaultAdmin.createdAt,
      defaultAdmin.isActive
    );
  }

  // 哈希密码
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // 迁移：添加新列
  private async migrateAddColumns() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // 检查列是否已存在
      const columns = await this.db.all('PRAGMA table_info(merchants)');
      const columnNames = columns.map((col: any) => col.name);

      // 添加 merchantId 列
      if (!columnNames.includes('merchantId')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN merchantId TEXT NOT NULL DEFAULT ''`);
      }

      // 添加 pinduoduoName 列
      if (!columnNames.includes('pinduoduoName')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN pinduoduoName TEXT NOT NULL DEFAULT ''`);
      }

      // 添加 mentionList 列
      if (!columnNames.includes('mentionList')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN mentionList TEXT DEFAULT '[]'`);
      }

      // 添加 subAccount 列
      if (!columnNames.includes('subAccount')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN subAccount TEXT NOT NULL DEFAULT ''`);
      }

      // 添加 pinduoduoPassword 列
      if (!columnNames.includes('pinduoduoPassword')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN pinduoduoPassword TEXT NOT NULL DEFAULT ''`);
      }

      // 添加 cookie 列
      if (!columnNames.includes('cookie')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN cookie TEXT NOT NULL DEFAULT ''`);
      }

      // 添加 pinduoduoShopId 列
      if (!columnNames.includes('pinduoduoShopId')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN pinduoduoShopId TEXT NOT NULL DEFAULT ''`);
      }

      // 添加 sendOrderScreenshot 列
      if (!columnNames.includes('sendOrderScreenshot')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN sendOrderScreenshot INTEGER DEFAULT 0`);
      }

      // 检查 products 表的列
      const productColumns = await this.db.all('PRAGMA table_info(products)');
      const productColumnNames = productColumns.map((col: any) => col.name);

      // 添加 productSpec 列到 products 表
      if (!productColumnNames.includes('productSpec')) {
        await this.db.exec(`ALTER TABLE products ADD COLUMN productSpec TEXT NOT NULL DEFAULT ''`);
      }

      // 检查 product_sales_orders 表的列
      const orderColumns = await this.db.all('PRAGMA table_info(product_sales_orders)');
      const orderColumnNames = orderColumns.map((col: any) => col.name);

      // 添加 updatedAt 列到 product_sales_orders 表
      if (!orderColumnNames.includes('updatedAt')) {
        await this.db.exec(`ALTER TABLE product_sales_orders ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''`);
        // 为现有记录设置updatedAt为createdAt的值
        await this.db.exec(`UPDATE product_sales_orders SET updatedAt = createdAt WHERE updatedAt = ''`);
      }

      // 检查 employees 表的列
      const employeeColumns = await this.db.all('PRAGMA table_info(employees)');
      const employeeColumnNames = employeeColumns.map((col: any) => col.name);

      // 添加 phone 列到 employees 表
      if (!employeeColumnNames.includes('phone')) {
        await this.db.exec(`ALTER TABLE employees ADD COLUMN phone TEXT NOT NULL DEFAULT ''`);
      }

      // 添加 password 列到 employees 表
      if (!employeeColumnNames.includes('password')) {
        await this.db.exec(`ALTER TABLE employees ADD COLUMN password TEXT NOT NULL DEFAULT ''`);
      }
    } catch (error) {
      console.error('Error migrating columns:', error);
    }
  }

  // 迁移：为订单表添加唯一索引
  private async migrateAddUniqueIndex() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // 检查索引是否已存在
      const indexes = await this.db.all('PRAGMA index_list(product_sales_orders)');
      const indexExists = indexes.some((idx: any) => idx.name === 'idx_unique_order');

      if (!indexExists) {
        // 在创建唯一索引之前,先清理重复数据
        await this.cleanDuplicateOrders();

        // 创建唯一索引
        await this.db.exec(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_order
          ON product_sales_orders(shopId, productId, salesDate)
        `);
        console.log('已为订单表添加唯一索引: (shopId, productId, salesDate)');
      }
    } catch (error) {
      console.error('Error migrating unique index:', error);
    }
  }

  // 清理重复的订单数据,保留最新的记录
  private async cleanDuplicateOrders() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // 查找所有重复的订单组合
      const duplicates = await this.db.all(`
        SELECT shopId, productId, salesDate, COUNT(*) as count
        FROM product_sales_orders
        GROUP BY shopId, productId, salesDate
        HAVING count > 1
      `);

      if (duplicates.length === 0) {
        console.log('未发现重复的订单数据');
        return;
      }

      console.log(`发现 ${duplicates.length} 组重复的订单数据,开始清理...`);

      let totalDeleted = 0;

      // 对每组重复数据,保留最新的(id最大的),删除其他的
      for (const dup of duplicates) {
        const { shopId, productId, salesDate } = dup;

        // 获取这组重复数据的所有记录,按 id 降序排列
        const records = await this.db.all(
          `SELECT id FROM product_sales_orders
           WHERE shopId = ? AND productId = ? AND salesDate = ?
           ORDER BY id DESC`,
          shopId,
          productId,
          salesDate
        );

        // 保留第一条(最新的),删除其余的
        if (records.length > 1) {
          const idsToDelete = records.slice(1).map((r: any) => r.id);

          for (const idToDelete of idsToDelete) {
            await this.db.run(
              'DELETE FROM product_sales_orders WHERE id = ?',
              idToDelete
            );
            totalDeleted++;
          }

          console.log(
            `清理重复订单: shopId=${shopId}, productId=${productId}, salesDate=${salesDate}, 删除 ${idsToDelete.length} 条旧记录`
          );
        }
      }

      console.log(`清理完成,共删除 ${totalDeleted} 条重复记录`);
    } catch (error) {
      console.error('Error cleaning duplicate orders:', error);
      throw error;
    }
  }

  // 从JSON文件迁移数据到SQLite
  async migrateFromJson() {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 检查是否已经迁移过
    try {
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS migration_info (
          id INTEGER PRIMARY KEY,
          migrated_at TEXT NOT NULL,
          source TEXT NOT NULL
        )
      `);

      // 检查是否已有迁移记录
      const migrationRecord = await this.db.get(
        'SELECT * FROM migration_info WHERE source = ?',
        'json_to_sqlite'
      );

      if (migrationRecord) {
        // 已完成迁移，跳过
        return;
      }
    } catch (error) {
      console.error('检查迁移状态失败:', error);
    }

    const jsonPath = path.join(process.cwd(), 'data/merchants.json');
    if (!fs.existsSync(jsonPath)) {
      return;
    }

    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const merchants = jsonData.merchants || [];

      // 开始事务
      await this.db.exec('BEGIN TRANSACTION');

      // 检查表是否为空
      const count = await this.db.get('SELECT COUNT(*) as count FROM merchants');
      if (count.count > 0) {
        await this.db.exec('COMMIT');
        return;
      }

      // 准备插入语句
      const stmt = await this.db.prepare(`
        INSERT INTO merchants (id, createdAt, name, merchantId, pinduoduoName, warehouse1, groupName, sendMessage, mentionList)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 插入每条记录
      for (const merchant of merchants) {
        await stmt.run(
          merchant.id,
          merchant.createdAt,
          merchant.name,
          (merchant as any).merchantId || '',
          (merchant as any).pinduoduoName || '',
          merchant.warehouse1,
          merchant.groupName,
          merchant.sendMessage ? 1 : 0,
          JSON.stringify((merchant as any).mentionList || [])
        );
      }

      // 完成语句并提交事务
      await stmt.finalize();

      // 迁移完成后记录迁移状态
      await this.db.run(
        'INSERT INTO migration_info (migrated_at, source) VALUES (?, ?)',
        new Date().toISOString(),
        'json_to_sqlite'
      );

      await this.db.exec('COMMIT');
    } catch (error) {
      if (this.db) {
        await this.db.exec('ROLLBACK');
      }
      console.error('Error migrating data from JSON:', error);
      throw error;
    }
  }

  // ===== 商家相关方法 =====

  // CREATE
  async insertMerchant(merchant: Omit<Merchant, 'id' | 'createdAt'>): Promise<Merchant> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    await this.db.run(
      `INSERT INTO merchants (id, createdAt, name, merchantId, pinduoduoName, pinduoduoShopId, warehouse1, groupName, sendMessage, sendOrderScreenshot, mentionList, subAccount, pinduoduoPassword, cookie)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      merchant.name,
      merchant.merchantId || '',
      merchant.pinduoduoName || '',
      merchant.pinduoduoShopId || '',
      merchant.warehouse1,
      merchant.groupName,
      merchant.sendMessage ? 1 : 0,
      merchant.sendOrderScreenshot ? 1 : 0,
      JSON.stringify(merchant.mentionList || []),
      merchant.subAccount || '',
      merchant.pinduoduoPassword || '',
      merchant.cookie || ''
    );

    return {
      id,
      createdAt,
      ...merchant,
      mentionList: merchant.mentionList || []
    };
  }

  // READ
  async getMerchantById(id: string): Promise<Merchant | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM merchants WHERE id = ?',
      id
    );

    if (!row) return null;

    return this.rowToMerchant(row);
  }

  async getAllMerchants(): Promise<Merchant[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all('SELECT * FROM merchants');
    return rows.map(row => this.rowToMerchant(row));
  }

  // 根据商家名称查找商家
  async getMerchantByName(name: string): Promise<Merchant | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM merchants WHERE name = ?',
      name
    );

    if (!row) return null;

    return this.rowToMerchant(row);
  }

  // 根据多多买菜店铺ID查找商家
  async getMerchantByPinduoduoShopId(pinduoduoShopId: string): Promise<Merchant | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM merchants WHERE pinduoduoShopId = ?',
      pinduoduoShopId
    );

    if (!row) return null;

    return this.rowToMerchant(row);
  }

  async getMerchantsPaginated(
    page: number,
    pageSize: number,
    filters?: {
      name?: string;
      merchantId?: string;
      pinduoduoName?: string;
      warehouse1?: string;
      groupName?: string;
      sendMessage?: 'true' | 'false';
    },
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<Merchant>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 如果有特定字段过滤，使用 QueryBuilder
    if (filters && Object.values(filters).some(v => v !== undefined)) {
      const builder = new QueryBuilder('merchants');
      builder.select('*');

      // 添加各个字段的过滤条件
      if (filters.name) {
        builder.where('name LIKE ?', `%${filters.name}%`);
      }
      if (filters.merchantId) {
        builder.where('merchantId LIKE ?', `%${filters.merchantId}%`);
      }
      if (filters.pinduoduoName) {
        builder.where('pinduoduoName LIKE ?', `%${filters.pinduoduoName}%`);
      }
      if (filters.warehouse1) {
        builder.where('warehouse1 LIKE ?', `%${filters.warehouse1}%`);
      }
      if (filters.groupName) {
        builder.where('groupName LIKE ?', `%${filters.groupName}%`);
      }
      if (filters.sendMessage) {
        builder.where('sendMessage = ?', filters.sendMessage === 'true' ? 1 : 0);
      }

      // 添加排序和分页
      builder.orderBy(orderBy || 'createdAt', orderDirection || 'DESC');
      builder.paginate(page, pageSize);

      // 执行查询
      const query = builder.buildQuery();
      const countQuery = builder.buildCountQuery();

      const [rows, countResult] = await Promise.all([
        this.db.all(query.sql, ...query.params),
        this.db.get(countQuery.sql, ...countQuery.params)
      ]);

      const total = countResult.count;
      const totalPages = Math.ceil(total / pageSize);

      return {
        items: rows.map(row => this.rowToMerchant(row)),
        total,
        page,
        pageSize,
        totalPages
      };
    }

    // 否则使用原来的简单分页
    const params: PaginationParams = {
      page,
      pageSize,
      orderBy: orderBy || 'createdAt',
      orderDirection: orderDirection || 'DESC'
    };

    return PaginationHelper.paginate<Merchant>(
      this.db,
      'merchants',
      params,
      (row) => this.rowToMerchant(row)
    );
  }

  // UPDATE
  async updateMerchant(id: string, updatedData: Partial<Merchant>): Promise<Merchant | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 先检查记录是否存在
    const existingMerchant = await this.getMerchantById(id);
    if (!existingMerchant) return null;

    // 构建UPDATE语句
    const fields = Object.keys(updatedData).filter(key => 
      key !== 'id' && key !== 'createdAt'
    );
    
    if (fields.length === 0) return existingMerchant;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      if (field === 'sendMessage') {
        return updatedData.sendMessage ? 1 : 0;
      }
      if (field === 'sendOrderScreenshot') {
        return updatedData.sendOrderScreenshot ? 1 : 0;
      }
      if (field === 'mentionList') {
        return JSON.stringify(updatedData.mentionList || []);
      }
      return updatedData[field as keyof typeof updatedData];
    });

    await this.db.run(
      `UPDATE merchants SET ${setClause} WHERE id = ?`,
      ...values, id
    );

    return this.getMerchantById(id);
  }

  // DELETE
  async deleteMerchant(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      'DELETE FROM merchants WHERE id = ?',
      id
    );

    return result.changes ? result.changes > 0 : false;
  }

  // ===== 用户相关方法 =====

  // 验证用户登录
  async validateUser(username: string, password: string): Promise<User | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const hashedPassword = this.hashPassword(password);
    
    const row = await this.db.get(
      'SELECT * FROM users WHERE username = ? AND password = ? AND isActive = 1',
      username, hashedPassword
    );

    if (!row) return null;

    return this.rowToUser(row);
  }

  // 获取所有用户（不返回密码）
  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all('SELECT * FROM users');
    return rows.map(row => {
      const user = this.rowToUser(row);
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  // 分页查询用户（不返回密码）
  async getUsersPaginated(
    page: number,
    pageSize: number,
    search?: string,
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<Omit<User, 'password'>>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const params: PaginationParams = {
      page,
      pageSize,
      search,
      searchFields: ['username', 'displayName'],
      orderBy: orderBy || 'createdAt',
      orderDirection: orderDirection || 'DESC'
    };

    const result = await PaginationHelper.paginate<User>(
      this.db,
      'users',
      params,
      (row) => this.rowToUser(row)
    );

    // 移除密码字段
    return {
      ...result,
      items: result.items.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      })
    };
  }

  // 根据ID获取单个用户
  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM users WHERE id = ?',
      id
    );

    if (!row) return null;

    const user = this.rowToUser(row);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // 添加新用户
  async createUser(userData: { 
    username: string, 
    password: string, 
    displayName: string, 
    isActive: boolean 
  }): Promise<Omit<User, 'password'>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 检查用户名是否已存在
    const existingUser = await this.db.get(
      'SELECT * FROM users WHERE username = ?',
      userData.username
    );

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const hashedPassword = this.hashPassword(userData.password);

    await this.db.run(
      `INSERT INTO users (id, username, password, displayName, createdAt, isActive)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      userData.username,
      hashedPassword,
      userData.displayName,
      createdAt,
      userData.isActive ? 1 : 0
    );

    return {
      id,
      username: userData.username,
      displayName: userData.displayName,
      createdAt,
      isActive: userData.isActive
    };
  }

  // 更新用户
  async updateUser(id: string, updatedData: {
    displayName?: string,
    password?: string,
    isActive?: boolean
  }): Promise<Omit<User, 'password'> | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 先检查用户是否存在
    const existingUser = await this.getUserById(id);
    if (!existingUser) return null;

    // 构建UPDATE语句
    const fields: string[] = [];
    const values: any[] = [];

    if (updatedData.displayName) {
      fields.push('displayName = ?');
      values.push(updatedData.displayName);
    }

    if (updatedData.password) {
      fields.push('password = ?');
      values.push(this.hashPassword(updatedData.password));
    }

    if (typeof updatedData.isActive === 'boolean') {
      fields.push('isActive = ?');
      values.push(updatedData.isActive ? 1 : 0);
    }
    
    if (fields.length === 0) return existingUser;

    values.push(id);

    await this.db.run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );

    return this.getUserById(id);
  }

  // 删除用户
  async deleteUser(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 检查是否删除的是最后一个管理员
    const usersCount = await this.db.get('SELECT COUNT(*) as count FROM users');
    if (usersCount.count === 1) {
      throw new Error('无法删除最后一个管理员账号');
    }

    const result = await this.db.run(
      'DELETE FROM users WHERE id = ?',
      id
    );

    return result.changes ? result.changes > 0 : false;
  }

  // ===== Settings 相关方法 =====

  // 获取设置值
  async getSetting(key: string): Promise<string | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT value FROM settings WHERE key = ?',
      key
    );

    return row ? row.value : null;
  }

  // 获取所有设置
  async getAllSettings(): Promise<Record<string, string>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all('SELECT key, value FROM settings');

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return settings;
  }

  // 更新设置
  async updateSetting(key: string, value: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    await this.db.run(
      `INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)`,
      key,
      value,
      now
    );
  }

  // 批量更新设置
  async updateSettings(settings: Record<string, string>): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    await this.transaction(async () => {
      for (const [key, value] of Object.entries(settings)) {
        await this.db!.run(
          `INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)`,
          key,
          value,
          now
        );
      }
    });
  }

  // ===== 公用方法 =====

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec('BEGIN TRANSACTION');
    try {
      const result = await callback();
      await this.db.exec('COMMIT');
      return result;
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private rowToMerchant(row: any): Merchant {
    let mentionList: string[] = [];
    try {
      mentionList = row.mentionList ? JSON.parse(row.mentionList) : [];
    } catch (e) {
      mentionList = [];
    }

    return {
      id: row.id,
      createdAt: row.createdAt,
      name: row.name,
      merchantId: row.merchantId || '',
      pinduoduoName: row.pinduoduoName || '',
      pinduoduoShopId: row.pinduoduoShopId || '',
      warehouse1: row.warehouse1,
      groupName: row.groupName,
      sendMessage: !!row.sendMessage,
      sendOrderScreenshot: !!row.sendOrderScreenshot,
      mentionList,
      subAccount: row.subAccount || '',
      pinduoduoPassword: row.pinduoduoPassword || '',
      cookie: row.cookie || ''
    };
  }

  private rowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      displayName: row.displayName,
      createdAt: row.createdAt,
      isActive: !!row.isActive
    };
  }

  // ===== 商品相关方法 =====

  // CREATE
  async insertProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    await this.db.run(
      `INSERT INTO products (id, createdAt, pinduoduoProductId, pinduoduoProductImage, productName, pinduoduoProductName, productSpec, merchantId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      product.pinduoduoProductId || '',
      product.pinduoduoProductImage || '',
      product.productName,
      product.pinduoduoProductName || '',
      product.productSpec || '',
      product.merchantId
    );

    return {
      id,
      createdAt,
      ...product
    };
  }

  // READ
  async getProductById(id: string): Promise<Product | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM products WHERE id = ?',
      id
    );

    if (!row) return null;

    return this.rowToProduct(row);
  }

  // 根据多多买菜商品ID和店铺ID查询商品
  async getProductByPinduoduoIdAndShopId(pinduoduoProductId: string, pinduoduoShopId: string): Promise<Product | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 先根据店铺ID查找商家
    const merchant = await this.getMerchantByPinduoduoShopId(pinduoduoShopId);
    if (!merchant) return null;

    // 然后查找该商家下的指定商品
    const row = await this.db.get(
      'SELECT * FROM products WHERE pinduoduoProductId = ? AND merchantId = ?',
      pinduoduoProductId,
      merchant.id
    );

    if (!row) return null;

    return this.rowToProduct(row);
  }

  async getProductsPaginated(
    page: number,
    pageSize: number,
    filters?: {
      productName?: string;
      pinduoduoProductId?: string;
      pinduoduoProductName?: string;
      merchantId?: string;
    },
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<Product>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 如果有特定字段过滤，使用 QueryBuilder
    if (filters && Object.values(filters).some(v => v !== undefined)) {
      const builder = new QueryBuilder('products');
      builder.select('*');

      // 添加各个字段的过滤条件
      if (filters.productName) {
        builder.where('productName LIKE ?', `%${filters.productName}%`);
      }
      if (filters.pinduoduoProductId) {
        builder.where('pinduoduoProductId LIKE ?', `%${filters.pinduoduoProductId}%`);
      }
      if (filters.pinduoduoProductName) {
        builder.where('pinduoduoProductName LIKE ?', `%${filters.pinduoduoProductName}%`);
      }
      if (filters.merchantId) {
        builder.where('merchantId = ?', filters.merchantId);
      }

      // 添加排序和分页
      builder.orderBy(orderBy || 'createdAt', orderDirection || 'DESC');
      builder.paginate(page, pageSize);

      // 执行查询
      const query = builder.buildQuery();
      const countQuery = builder.buildCountQuery();

      const [rows, countResult] = await Promise.all([
        this.db.all(query.sql, ...query.params),
        this.db.get(countQuery.sql, ...countQuery.params)
      ]);

      const total = countResult.count;
      const totalPages = Math.ceil(total / pageSize);

      return {
        items: rows.map(row => this.rowToProduct(row)),
        total,
        page,
        pageSize,
        totalPages
      };
    }

    // 否则使用原来的简单分页
    const params: PaginationParams = {
      page,
      pageSize,
      orderBy: orderBy || 'createdAt',
      orderDirection: orderDirection || 'DESC'
    };

    return PaginationHelper.paginate<Product>(
      this.db,
      'products',
      params,
      (row) => this.rowToProduct(row)
    );
  }

  // UPDATE
  async updateProduct(id: string, updatedData: Partial<Product>): Promise<Product | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 先检查记录是否存在
    const existingProduct = await this.getProductById(id);
    if (!existingProduct) return null;

    // 构建UPDATE语句
    const fields = Object.keys(updatedData).filter(key =>
      key !== 'id' && key !== 'createdAt'
    );

    if (fields.length === 0) return existingProduct;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updatedData[field as keyof typeof updatedData]);

    await this.db.run(
      `UPDATE products SET ${setClause} WHERE id = ?`,
      ...values, id
    );

    return this.getProductById(id);
  }

  // DELETE
  async deleteProduct(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      'DELETE FROM products WHERE id = ?',
      id
    );

    return result.changes ? result.changes > 0 : false;
  }

  private rowToProduct(row: any): Product {
    return {
      id: row.id,
      createdAt: row.createdAt,
      pinduoduoProductId: row.pinduoduoProductId || '',
      pinduoduoProductImage: row.pinduoduoProductImage || '',
      productName: row.productName,
      pinduoduoProductName: row.pinduoduoProductName || '',
      productSpec: row.productSpec || '',
      merchantId: row.merchantId
    };
  }

  // ==================== Product Sales Orders ====================

  async insertProductSalesOrder(order: Omit<ProductSalesOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductSalesOrder> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    const result = await this.db.run(
      `INSERT INTO product_sales_orders (
        createdAt, updatedAt, shopName, shopId, productId, productName, productImage,
        salesArea, warehouseInfo, salesDate, salesSpec,
        totalStock, estimatedSales, totalSales, salesQuantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      now,
      now,
      order.shopName,
      order.shopId,
      order.productId,
      order.productName,
      order.productImage || '',
      order.salesArea,
      order.warehouseInfo,
      order.salesDate,
      order.salesSpec,
      order.totalStock,
      order.estimatedSales,
      order.totalSales,
      order.salesQuantity
    );

    const id = result.lastID!.toString();

    return {
      id,
      createdAt: now,
      updatedAt: now,
      ...order
    };
  }

  async getProductSalesOrdersPaginated(
    page: number,
    pageSize: number,
    filters?: {
      shopName?: string;
      productName?: string;
      salesArea?: string;
      salesDate?: string;
    },
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<ProductSalesOrder>> {
    if (!this.db) throw new Error('Database not initialized');

    const builder = new QueryBuilder('product_sales_orders');

    // 添加筛选条件
    if (filters) {
      if (filters.shopName) {
        builder.where('shopName LIKE ?', `%${filters.shopName}%`);
      }
      if (filters.productName) {
        builder.where('productName LIKE ?', `%${filters.productName}%`);
      }
      if (filters.salesArea) {
        builder.where('salesArea LIKE ?', `%${filters.salesArea}%`);
      }
      if (filters.salesDate) {
        builder.where('salesDate = ?', filters.salesDate);
      }
    }

    // 设置排序（默认按创建时间倒序，最新的在前）
    builder.orderBy(orderBy || 'createdAt', orderDirection || 'DESC');

    // 手动执行查询和分页
    const offset = (page - 1) * pageSize;

    // 构建查询SQL和计数SQL
    const { sql: querySql, params: queryParams } = builder.buildQuery();
    const { sql: countSql, params: countParams } = builder.buildCountQuery();

    // 添加分页
    const paginatedSql = `${querySql} LIMIT ? OFFSET ?`;
    const paginatedParams = [...queryParams, pageSize, offset];

    // 执行查询
    const [rows, countResult] = await Promise.all([
      this.db.all(paginatedSql, ...paginatedParams),
      this.db.get(countSql, ...countParams)
    ]);

    const total = countResult?.count || 0;
    const items = rows.map(this.rowToProductSalesOrder.bind(this));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async getProductSalesOrderById(id: string): Promise<ProductSalesOrder | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM product_sales_orders WHERE id = ?',
      id
    );

    return row ? this.rowToProductSalesOrder(row) : null;
  }

  // 根据店铺ID、商品ID和销售日期查询订单（唯一性查询）
  async getProductSalesOrderByUniqueKey(
    shopId: string,
    productId: string,
    salesDate: string
  ): Promise<ProductSalesOrder | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM product_sales_orders WHERE shopId = ? AND productId = ? AND salesDate = ?',
      shopId,
      productId,
      salesDate
    );

    return row ? this.rowToProductSalesOrder(row) : null;
  }

  // 根据销售日期获取订单列表(关联商家表和商品表)
  async getProductSalesOrdersByDate(salesDate: string): Promise<(ProductSalesOrder & { merchantName: string; cloudProductName: string })[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      `SELECT
        o.*,
        COALESCE(m.name, '') as merchantName,
        COALESCE(p.productName, '') as cloudProductName
       FROM product_sales_orders o
       LEFT JOIN merchants m ON o.shopId = m.pinduoduoShopId
       LEFT JOIN products p ON o.productId = p.pinduoduoProductId AND m.id = p.merchantId
       WHERE o.salesDate = ?
       ORDER BY o.createdAt DESC`,
      salesDate
    );

    return rows.map(row => ({
      ...this.rowToProductSalesOrder(row),
      merchantName: row.merchantName || '',
      cloudProductName: row.cloudProductName || ''
    }));
  }

  // 更新订单
  async updateProductSalesOrder(
    id: string,
    orderData: Partial<Omit<ProductSalesOrder, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ProductSalesOrder | null> {
    if (!this.db) throw new Error('Database not initialized');

    // 先检查订单是否存在
    const existingOrder = await this.getProductSalesOrderById(id);
    if (!existingOrder) return null;

    // 构建UPDATE语句
    const fields: string[] = [];
    const values: any[] = [];

    // 始终更新 updatedAt
    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());

    if (orderData.shopName !== undefined) {
      fields.push('shopName = ?');
      values.push(orderData.shopName);
    }
    if (orderData.shopId !== undefined) {
      fields.push('shopId = ?');
      values.push(orderData.shopId);
    }
    if (orderData.productId !== undefined) {
      fields.push('productId = ?');
      values.push(orderData.productId);
    }
    if (orderData.productName !== undefined) {
      fields.push('productName = ?');
      values.push(orderData.productName);
    }
    if (orderData.productImage !== undefined) {
      fields.push('productImage = ?');
      values.push(orderData.productImage || '');
    }
    if (orderData.salesArea !== undefined) {
      fields.push('salesArea = ?');
      values.push(orderData.salesArea);
    }
    if (orderData.warehouseInfo !== undefined) {
      fields.push('warehouseInfo = ?');
      values.push(orderData.warehouseInfo);
    }
    if (orderData.salesDate !== undefined) {
      fields.push('salesDate = ?');
      values.push(orderData.salesDate);
    }
    if (orderData.salesSpec !== undefined) {
      fields.push('salesSpec = ?');
      values.push(orderData.salesSpec);
    }
    if (orderData.totalStock !== undefined) {
      fields.push('totalStock = ?');
      values.push(orderData.totalStock);
    }
    if (orderData.estimatedSales !== undefined) {
      fields.push('estimatedSales = ?');
      values.push(orderData.estimatedSales);
    }
    if (orderData.totalSales !== undefined) {
      fields.push('totalSales = ?');
      values.push(orderData.totalSales);
    }
    if (orderData.salesQuantity !== undefined) {
      fields.push('salesQuantity = ?');
      values.push(orderData.salesQuantity);
    }

    if (fields.length === 0) return existingOrder;

    values.push(id);

    await this.db.run(
      `UPDATE product_sales_orders SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );

    return this.getProductSalesOrderById(id);
  }

  private rowToProductSalesOrder(row: any): ProductSalesOrder {
    return {
      id: row.id.toString(),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
      shopName: row.shopName,
      shopId: row.shopId,
      productId: row.productId,
      productName: row.productName,
      productImage: row.productImage || '',
      salesArea: row.salesArea,
      warehouseInfo: row.warehouseInfo,
      salesDate: row.salesDate,
      salesSpec: row.salesSpec,
      totalStock: row.totalStock,
      estimatedSales: row.estimatedSales,
      totalSales: row.totalSales,
      salesQuantity: row.salesQuantity
    };
  }

  // ==================== Daily Deliveries (当日送货) ====================

  async insertDailyDelivery(delivery: Omit<DailyDelivery, 'id' | 'createdAt'>): Promise<DailyDelivery> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    await this.db.run(
      `INSERT INTO daily_deliveries (
        id, createdAt, merchantName, productName, unit,
        dispatchQuantity, estimatedSales, surplusQuantity, distributionStatus,
        warehousingStatus, dataType, entryUser, operators, deliveryDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      delivery.merchantName,
      delivery.productName,
      delivery.unit,
      delivery.dispatchQuantity,
      delivery.estimatedSales,
      delivery.surplusQuantity || 0,
      delivery.distributionStatus,
      delivery.warehousingStatus,
      delivery.dataType || 0,
      delivery.entryUser,
      delivery.operators || '[]',
      delivery.deliveryDate
    );

    return {
      id,
      createdAt,
      ...delivery,
      surplusQuantity: delivery.surplusQuantity || 0,
      dataType: delivery.dataType || 0
    };
  }

  async getDailyDeliveryById(id: string): Promise<DailyDelivery | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM daily_deliveries WHERE id = ?',
      id
    );

    return row ? this.rowToDailyDelivery(row) : null;
  }

  async getDailyDeliveriesPaginated(
    page: number,
    pageSize: number,
    filters?: {
      merchantName?: string;
      productName?: string;
      deliveryDate?: string;
      distributionStatus?: number;
      warehousingStatus?: number;
      dataType?: number;
    },
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<DailyDelivery>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const builder = new QueryBuilder('daily_deliveries');
    builder.select('*');

    if (filters) {
      if (filters.merchantName) {
        builder.where('merchantName LIKE ?', `%${filters.merchantName}%`);
      }
      if (filters.productName) {
        builder.where('productName LIKE ?', `%${filters.productName}%`);
      }
      if (filters.deliveryDate) {
        builder.where('deliveryDate = ?', filters.deliveryDate);
      }
      if (filters.distributionStatus !== undefined) {
        builder.where('distributionStatus = ?', filters.distributionStatus);
      }
      if (filters.warehousingStatus !== undefined) {
        builder.where('warehousingStatus = ?', filters.warehousingStatus);
      }
      if (filters.dataType !== undefined) {
        builder.where('dataType = ?', filters.dataType);
      }
    }

    builder.orderBy(orderBy || 'createdAt', orderDirection || 'DESC');
    builder.paginate(page, pageSize);

    const query = builder.buildQuery();
    const countQuery = builder.buildCountQuery();

    const [rows, countResult] = await Promise.all([
      this.db.all(query.sql, ...query.params),
      this.db.get(countQuery.sql, ...countQuery.params)
    ]);

    const total = countResult.count;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: rows.map(row => this.rowToDailyDelivery(row)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async updateDailyDelivery(id: string, updatedData: Partial<DailyDelivery>): Promise<DailyDelivery | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existingDelivery = await this.getDailyDeliveryById(id);
    if (!existingDelivery) return null;

    const fields = Object.keys(updatedData).filter(key =>
      key !== 'id' && key !== 'createdAt'
    );

    if (fields.length === 0) return existingDelivery;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updatedData[field as keyof typeof updatedData]);

    await this.db.run(
      `UPDATE daily_deliveries SET ${setClause} WHERE id = ?`,
      ...values, id
    );

    return this.getDailyDeliveryById(id);
  }

  async deleteDailyDelivery(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      'DELETE FROM daily_deliveries WHERE id = ?',
      id
    );

    return result.changes ? result.changes > 0 : false;
  }

  // 获取当日未配货列表（distributionStatus = 0 或 3改配）
  async getTodayUndeliveredList(date: string): Promise<(DailyDelivery & { productImage?: string })[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      `SELECT d.*, p.pinduoduoProductImage as productImage
       FROM daily_deliveries d
       LEFT JOIN products p ON d.productName = p.productName
       WHERE d.deliveryDate = ? AND (d.distributionStatus = 0 OR d.distributionStatus = 3)
       ORDER BY d.createdAt DESC`,
      date
    );

    return rows.map(row => ({
      ...this.rowToDailyDelivery(row),
      productImage: row.productImage || undefined
    }));
  }

  // 获取当日未入库列表（已配货 distributionStatus = 1 且 未入库 warehousingStatus = 0）
  async getTodayUnstockedList(date: string): Promise<(DailyDelivery & { productImage?: string })[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      `SELECT d.*, p.pinduoduoProductImage as productImage
       FROM daily_deliveries d
       LEFT JOIN products p ON d.productName = p.productName
       WHERE d.deliveryDate = ? AND d.distributionStatus = 1 AND d.warehousingStatus = 0
       ORDER BY d.createdAt DESC`,
      date
    );

    return rows.map(row => ({
      ...this.rowToDailyDelivery(row),
      productImage: row.productImage || undefined
    }));
  }

  // 获取当日入库列表（所有已配货的记录，包含已入库和未入库，用于入库页面展示）
  async getTodayStockList(date: string): Promise<(DailyDelivery & { productImage?: string })[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      `SELECT d.*, p.pinduoduoProductImage as productImage
       FROM daily_deliveries d
       LEFT JOIN products p ON d.productName = p.productName
       WHERE d.deliveryDate = ? AND d.distributionStatus = 1
       ORDER BY d.warehousingStatus ASC, d.createdAt DESC`,
      date
    );

    return rows.map(row => ({
      ...this.rowToDailyDelivery(row),
      productImage: row.productImage || undefined
    }));
  }

  // 检查当日送货记录是否已存在（用于导入时的重复检测）
  async checkDailyDeliveryExists(merchantName: string, productName: string, deliveryDate: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT 1 FROM daily_deliveries WHERE merchantName = ? AND productName = ? AND deliveryDate = ?',
      merchantName,
      productName,
      deliveryDate
    );

    return !!row;
  }

  // 批量检查当日送货记录是否已存在（用于导入时的重复检测，返回已存在的记录键值）
  async checkDailyDeliveriesExist(items: { merchantName: string; productName: string; deliveryDate: string }[]): Promise<Set<string>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existingKeys = new Set<string>();

    // 获取所有涉及日期的记录
    const dates = Array.from(new Set(items.map(item => item.deliveryDate)));

    for (const date of dates) {
      const rows = await this.db.all(
        'SELECT merchantName, productName FROM daily_deliveries WHERE deliveryDate = ?',
        date
      );

      for (const row of rows) {
        const key = `${row.merchantName}|${row.productName}|${date}`;
        existingKeys.add(key);
      }
    }

    return existingKeys;
  }

  // 统计当日送货记录数量（根据过滤条件）
  async countDailyDeliveries(filters?: {
    merchantName?: string;
    productName?: string;
    deliveryDate?: string;
    distributionStatus?: number;
    warehousingStatus?: number;
    dataType?: number;
  }): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT COUNT(*) as count FROM daily_deliveries WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.merchantName) {
        sql += ' AND merchantName LIKE ?';
        params.push(`%${filters.merchantName}%`);
      }
      if (filters.productName) {
        sql += ' AND productName LIKE ?';
        params.push(`%${filters.productName}%`);
      }
      if (filters.deliveryDate) {
        sql += ' AND deliveryDate = ?';
        params.push(filters.deliveryDate);
      }
      if (filters.distributionStatus !== undefined) {
        sql += ' AND distributionStatus = ?';
        params.push(filters.distributionStatus);
      }
      if (filters.warehousingStatus !== undefined) {
        sql += ' AND warehousingStatus = ?';
        params.push(filters.warehousingStatus);
      }
      if (filters.dataType !== undefined) {
        sql += ' AND dataType = ?';
        params.push(filters.dataType);
      }
    }

    const row = await this.db.get(sql, ...params);
    return row?.count || 0;
  }

  // 根据自定义条件统计数量
  async countDailyDeliveriesByCondition(condition: string, params: any[]): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const sql = `SELECT COUNT(*) as count FROM daily_deliveries WHERE ${condition}`;
    const row = await this.db.get(sql, ...params);
    return row?.count || 0;
  }

  private rowToDailyDelivery(row: any): DailyDelivery {
    return {
      id: row.id,
      createdAt: row.createdAt,
      merchantName: row.merchantName,
      productName: row.productName,
      unit: row.unit,
      dispatchQuantity: row.dispatchQuantity,
      estimatedSales: row.estimatedSales,
      surplusQuantity: row.surplusQuantity || 0,
      distributionStatus: row.distributionStatus,
      warehousingStatus: row.warehousingStatus,
      dataType: row.dataType || 0,
      entryUser: row.entryUser,
      operators: row.operators || '[]',
      deliveryDate: row.deliveryDate
    };
  }

  // ==================== Return Details (余货/客退明细) ====================

  async insertReturnDetail(returnDetail: Omit<ReturnDetail, 'id' | 'createdAt'>): Promise<ReturnDetail> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    await this.db.run(
      `INSERT INTO return_details (
        id, createdAt, merchantName, productName, unit,
        actualReturnQuantity, goodQuantity, defectiveQuantity,
        retrievalStatus, retrievedGoodQuantity, retrievedDefectiveQuantity,
        dataType, entryUser, operators, returnDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      returnDetail.merchantName,
      returnDetail.productName,
      returnDetail.unit,
      returnDetail.actualReturnQuantity,
      returnDetail.goodQuantity,
      returnDetail.defectiveQuantity,
      returnDetail.retrievalStatus,
      returnDetail.retrievedGoodQuantity,
      returnDetail.retrievedDefectiveQuantity,
      returnDetail.dataType || 0,
      returnDetail.entryUser,
      returnDetail.operators || '[]',
      returnDetail.returnDate
    );

    return {
      id,
      createdAt,
      ...returnDetail,
      dataType: returnDetail.dataType || 0
    };
  }

  async getReturnDetailById(id: string): Promise<ReturnDetail | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM return_details WHERE id = ?',
      id
    );

    return row ? this.rowToReturnDetail(row) : null;
  }

  async getReturnDetailsPaginated(
    page: number,
    pageSize: number,
    filters?: {
      merchantName?: string;
      productName?: string;
      returnDate?: string;
      retrievalStatus?: number;
      dataType?: number;
    },
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<ReturnDetail>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const builder = new QueryBuilder('return_details');
    builder.select('*');

    if (filters) {
      if (filters.merchantName) {
        builder.where('merchantName LIKE ?', `%${filters.merchantName}%`);
      }
      if (filters.productName) {
        builder.where('productName LIKE ?', `%${filters.productName}%`);
      }
      if (filters.returnDate) {
        builder.where('returnDate = ?', filters.returnDate);
      }
      if (filters.retrievalStatus !== undefined) {
        builder.where('retrievalStatus = ?', filters.retrievalStatus);
      }
      if (filters.dataType !== undefined) {
        builder.where('dataType = ?', filters.dataType);
      }
    }

    builder.orderBy(orderBy || 'createdAt', orderDirection || 'DESC');
    builder.paginate(page, pageSize);

    const query = builder.buildQuery();
    const countQuery = builder.buildCountQuery();

    const [rows, countResult] = await Promise.all([
      this.db.all(query.sql, ...query.params),
      this.db.get(countQuery.sql, ...countQuery.params)
    ]);

    const total = countResult.count;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: rows.map(row => this.rowToReturnDetail(row)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async updateReturnDetail(id: string, updatedData: Partial<ReturnDetail>): Promise<ReturnDetail | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existingReturnDetail = await this.getReturnDetailById(id);
    if (!existingReturnDetail) return null;

    const fields = Object.keys(updatedData).filter(key =>
      key !== 'id' && key !== 'createdAt'
    );

    if (fields.length === 0) return existingReturnDetail;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updatedData[field as keyof typeof updatedData]);

    await this.db.run(
      `UPDATE return_details SET ${setClause} WHERE id = ?`,
      ...values, id
    );

    return this.getReturnDetailById(id);
  }

  async deleteReturnDetail(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      'DELETE FROM return_details WHERE id = ?',
      id
    );

    return result.changes ? result.changes > 0 : false;
  }

  private rowToReturnDetail(row: any): ReturnDetail {
    return {
      id: row.id,
      createdAt: row.createdAt,
      merchantName: row.merchantName,
      productName: row.productName,
      unit: row.unit,
      actualReturnQuantity: row.actualReturnQuantity,
      goodQuantity: row.goodQuantity,
      defectiveQuantity: row.defectiveQuantity,
      retrievalStatus: row.retrievalStatus,
      retrievedGoodQuantity: row.retrievedGoodQuantity,
      retrievedDefectiveQuantity: row.retrievedDefectiveQuantity,
      dataType: row.dataType || 0,
      entryUser: row.entryUser,
      operators: row.operators || '[]',
      returnDate: row.returnDate
    };
  }

  // ==================== Employees (员工表) ====================

  async insertEmployee(employee: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 检查员工编号是否已存在
    const existingByNumber = await this.db.get(
      'SELECT * FROM employees WHERE employeeNumber = ?',
      employee.employeeNumber
    );
    if (existingByNumber) {
      throw new Error('员工编号已存在');
    }

    // 检查登录码是否已存在
    const existingByCode = await this.db.get(
      'SELECT * FROM employees WHERE loginCode = ?',
      employee.loginCode
    );
    if (existingByCode) {
      throw new Error('登录码已存在');
    }

    // 检查手机号是否已存在（如果提供了手机号）
    if (employee.phone) {
      const existingByPhone = await this.db.get(
        'SELECT * FROM employees WHERE phone = ?',
        employee.phone
      );
      if (existingByPhone) {
        throw new Error('手机号已被其他员工使用');
      }
    }

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    // 密码哈希处理
    const hashedPassword = employee.password ? this.hashPassword(employee.password) : '';

    await this.db.run(
      `INSERT INTO employees (
        id, createdAt, employeeNumber, name, realName, phone, password, loginCode, lastLoginTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      employee.employeeNumber,
      employee.name,
      employee.realName,
      employee.phone || '',
      hashedPassword,
      employee.loginCode,
      employee.lastLoginTime || null
    );

    return {
      id,
      createdAt,
      ...employee,
      password: hashedPassword // 返回哈希后的密码
    };
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM employees WHERE id = ?',
      id
    );

    return row ? this.rowToEmployee(row) : null;
  }

  async getEmployeeByLoginCode(loginCode: string): Promise<Employee | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM employees WHERE loginCode = ?',
      loginCode
    );

    return row ? this.rowToEmployee(row) : null;
  }

  async getEmployeesPaginated(
    page: number,
    pageSize: number,
    filters?: {
      name?: string;
      employeeNumber?: string;
      realName?: string;
    },
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<Employee>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const builder = new QueryBuilder('employees');
    builder.select('*');

    if (filters) {
      if (filters.name) {
        builder.where('name LIKE ?', `%${filters.name}%`);
      }
      if (filters.employeeNumber) {
        builder.where('employeeNumber LIKE ?', `%${filters.employeeNumber}%`);
      }
      if (filters.realName) {
        builder.where('realName LIKE ?', `%${filters.realName}%`);
      }
    }

    builder.orderBy(orderBy || 'createdAt', orderDirection || 'DESC');
    builder.paginate(page, pageSize);

    const query = builder.buildQuery();
    const countQuery = builder.buildCountQuery();

    const [rows, countResult] = await Promise.all([
      this.db.all(query.sql, ...query.params),
      this.db.get(countQuery.sql, ...countQuery.params)
    ]);

    const total = countResult.count;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: rows.map(row => this.rowToEmployee(row)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async updateEmployee(id: string, updatedData: Partial<Employee>): Promise<Employee | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existingEmployee = await this.getEmployeeById(id);
    if (!existingEmployee) return null;

    // 如果更新登录码，检查是否与其他员工冲突
    if (updatedData.loginCode && updatedData.loginCode !== existingEmployee.loginCode) {
      const existingByCode = await this.db.get(
        'SELECT * FROM employees WHERE loginCode = ? AND id != ?',
        updatedData.loginCode,
        id
      );
      if (existingByCode) {
        throw new Error('登录码已被其他员工使用');
      }
    }

    // 如果更新员工编号，检查是否与其他员工冲突
    if (updatedData.employeeNumber && updatedData.employeeNumber !== existingEmployee.employeeNumber) {
      const existingByNumber = await this.db.get(
        'SELECT * FROM employees WHERE employeeNumber = ? AND id != ?',
        updatedData.employeeNumber,
        id
      );
      if (existingByNumber) {
        throw new Error('员工编号已被其他员工使用');
      }
    }

    // 如果更新手机号，检查是否与其他员工冲突
    if (updatedData.phone && updatedData.phone !== existingEmployee.phone) {
      const existingByPhone = await this.db.get(
        'SELECT * FROM employees WHERE phone = ? AND id != ?',
        updatedData.phone,
        id
      );
      if (existingByPhone) {
        throw new Error('手机号已被其他员工使用');
      }
    }

    // 处理密码哈希
    const dataToUpdate = { ...updatedData };
    if (dataToUpdate.password) {
      dataToUpdate.password = this.hashPassword(dataToUpdate.password);
    }

    const fields = Object.keys(dataToUpdate).filter(key =>
      key !== 'id' && key !== 'createdAt'
    );

    if (fields.length === 0) return existingEmployee;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => dataToUpdate[field as keyof typeof dataToUpdate]);

    await this.db.run(
      `UPDATE employees SET ${setClause} WHERE id = ?`,
      ...values, id
    );

    return this.getEmployeeById(id);
  }

  async updateEmployeeLoginTime(id: string): Promise<Employee | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    await this.db.run(
      'UPDATE employees SET lastLoginTime = ? WHERE id = ?',
      now,
      id
    );

    return this.getEmployeeById(id);
  }

  async deleteEmployee(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      'DELETE FROM employees WHERE id = ?',
      id
    );

    return result.changes ? result.changes > 0 : false;
  }

  // 获取下一个员工编号的数字部分
  async getNextEmployeeNumberSuffix(): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // 查询所有员工编号，提取数字部分找到最大值
    const rows = await this.db.all(
      'SELECT employeeNumber FROM employees'
    );

    let maxNumber = 9999; // 起始值为9999，这样第一个编号会是10000

    for (const row of rows) {
      const employeeNumber = row.employeeNumber as string;
      // 提取编号中的数字部分（最后的连续数字）
      const match = employeeNumber.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    return maxNumber + 1;
  }

  private rowToEmployee(row: any): Employee {
    return {
      id: row.id,
      createdAt: row.createdAt,
      employeeNumber: row.employeeNumber,
      name: row.name,
      realName: row.realName,
      phone: row.phone || '',
      password: row.password || '',
      loginCode: row.loginCode,
      lastLoginTime: row.lastLoginTime || undefined
    };
  }

  // 通过手机号和密码验证员工登录
  async validateEmployeeByPhone(phone: string, password: string): Promise<Employee | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const hashedPassword = this.hashPassword(password);

    const row = await this.db.get(
      'SELECT * FROM employees WHERE phone = ? AND password = ?',
      phone,
      hashedPassword
    );

    if (!row) return null;

    // 更新最后登录时间
    await this.updateEmployeeLoginTime(row.id);

    return this.rowToEmployee(row);
  }

  // 通过手机号获取员工（不验证密码）
  async getEmployeeByPhone(phone: string): Promise<Employee | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM employees WHERE phone = ?',
      phone
    );

    return row ? this.rowToEmployee(row) : null;
  }

  // 公开的密码哈希方法（用于API层）
  hashEmployeePassword(password: string): string {
    return this.hashPassword(password);
  }

  // ==================== Operation Logs (操作日志) ====================

  async insertOperationLog(log: OperationLogFormData): Promise<OperationLog> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();

    await this.db.run(
      `INSERT INTO operation_logs (
        id, createdAt, targetTable, targetId, action,
        operatorType, operatorId, operatorName,
        fieldName, oldValue, newValue, changeDetail, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      log.targetTable,
      log.targetId,
      log.action,
      log.operatorType,
      log.operatorId,
      log.operatorName,
      log.fieldName || null,
      log.oldValue || null,
      log.newValue || null,
      log.changeDetail || null,
      log.remark || null
    );

    return {
      id,
      createdAt,
      ...log
    };
  }

  async getOperationLogById(id: string): Promise<OperationLog | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(
      'SELECT * FROM operation_logs WHERE id = ?',
      id
    );

    return row ? this.rowToOperationLog(row) : null;
  }

  async getOperationLogsPaginated(
    page: number,
    pageSize: number,
    filters?: {
      targetTable?: string;
      targetId?: string;
      action?: string;
      operatorType?: string;
      operatorId?: string;
      operatorName?: string;
      startDate?: string;
      endDate?: string;
    },
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ): Promise<PaginationResult<OperationLog>> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const builder = new QueryBuilder('operation_logs');
    builder.select('*');

    if (filters) {
      if (filters.targetTable) {
        builder.where('targetTable = ?', filters.targetTable);
      }
      if (filters.targetId) {
        builder.where('targetId = ?', filters.targetId);
      }
      if (filters.action) {
        builder.where('action = ?', filters.action);
      }
      if (filters.operatorType) {
        builder.where('operatorType = ?', filters.operatorType);
      }
      if (filters.operatorId) {
        builder.where('operatorId = ?', filters.operatorId);
      }
      if (filters.operatorName) {
        builder.where('operatorName LIKE ?', `%${filters.operatorName}%`);
      }
      if (filters.startDate) {
        builder.where('createdAt >= ?', filters.startDate);
      }
      if (filters.endDate) {
        builder.where('createdAt <= ?', filters.endDate + 'T23:59:59.999Z');
      }
    }

    builder.orderBy(orderBy || 'createdAt', orderDirection || 'DESC');
    builder.paginate(page, pageSize);

    const query = builder.buildQuery();
    const countQuery = builder.buildCountQuery();

    const [rows, countResult] = await Promise.all([
      this.db.all(query.sql, ...query.params),
      this.db.get(countQuery.sql, ...countQuery.params)
    ]);

    const total = countResult.count;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: rows.map(row => this.rowToOperationLog(row)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  // 获取某条记录的所有操作日志
  async getOperationLogsByTarget(targetTable: string, targetId: string): Promise<OperationLog[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      'SELECT * FROM operation_logs WHERE targetTable = ? AND targetId = ? ORDER BY createdAt DESC',
      targetTable,
      targetId
    );

    return rows.map(row => this.rowToOperationLog(row));
  }

  // 删除操作日志（通常不建议删除，仅用于特殊情况）
  async deleteOperationLog(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      'DELETE FROM operation_logs WHERE id = ?',
      id
    );

    return result.changes ? result.changes > 0 : false;
  }

  // 清理指定天数之前的日志
  async cleanOldOperationLogs(daysToKeep: number): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString();

    const result = await this.db.run(
      'DELETE FROM operation_logs WHERE createdAt < ?',
      cutoffDateStr
    );

    return result.changes || 0;
  }

  private rowToOperationLog(row: any): OperationLog {
    return {
      id: row.id,
      createdAt: row.createdAt,
      targetTable: row.targetTable,
      targetId: row.targetId,
      action: row.action,
      operatorType: row.operatorType,
      operatorId: row.operatorId,
      operatorName: row.operatorName,
      fieldName: row.fieldName || undefined,
      oldValue: row.oldValue || undefined,
      newValue: row.newValue || undefined,
      changeDetail: row.changeDetail || undefined,
      remark: row.remark || undefined
    };
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

const db = new SqliteDatabase();
export default db; 