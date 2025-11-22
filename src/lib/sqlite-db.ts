import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { Merchant, User, Product, ProductSalesOrder } from './types';
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
          salesQuantity INTEGER NOT NULL DEFAULT 0
        )
      `);

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

      this.initialized = true;
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      throw error;
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

    console.log('Default admin account created');
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
        console.log('Added merchantId column to merchants table');
      }

      // 添加 pinduoduoName 列
      if (!columnNames.includes('pinduoduoName')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN pinduoduoName TEXT NOT NULL DEFAULT ''`);
        console.log('Added pinduoduoName column to merchants table');
      }

      // 添加 mentionList 列
      if (!columnNames.includes('mentionList')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN mentionList TEXT DEFAULT '[]'`);
        console.log('Added mentionList column to merchants table');
      }

      // 添加 subAccount 列
      if (!columnNames.includes('subAccount')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN subAccount TEXT NOT NULL DEFAULT ''`);
        console.log('Added subAccount column to merchants table');
      }

      // 添加 pinduoduoPassword 列
      if (!columnNames.includes('pinduoduoPassword')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN pinduoduoPassword TEXT NOT NULL DEFAULT ''`);
        console.log('Added pinduoduoPassword column to merchants table');
      }

      // 添加 cookie 列
      if (!columnNames.includes('cookie')) {
        await this.db.exec(`ALTER TABLE merchants ADD COLUMN cookie TEXT NOT NULL DEFAULT ''`);
        console.log('Added cookie column to merchants table');
      }
    } catch (error) {
      console.error('Error migrating columns:', error);
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
        console.log(`已经完成过迁移，时间: ${migrationRecord.migrated_at}`);
        return;
      }
    } catch (error) {
      console.error('检查迁移状态失败:', error);
    }

    const jsonPath = path.join(process.cwd(), 'data/merchants.json');
    if (!fs.existsSync(jsonPath)) {
      console.log('JSON文件不存在，无需迁移');
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
        console.log('SQLite数据库已有数据，跳过迁移');
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
      console.log(`成功迁移 ${merchants.length} 条商家记录，从JSON到SQLite`);
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
      `INSERT INTO merchants (id, createdAt, name, merchantId, pinduoduoName, warehouse1, groupName, sendMessage, mentionList, subAccount, pinduoduoPassword, cookie)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      merchant.name,
      merchant.merchantId || '',
      merchant.pinduoduoName || '',
      merchant.warehouse1,
      merchant.groupName,
      merchant.sendMessage ? 1 : 0,
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
      warehouse1: row.warehouse1,
      groupName: row.groupName,
      sendMessage: !!row.sendMessage,
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
      `INSERT INTO products (id, createdAt, pinduoduoProductId, pinduoduoProductImage, productName, pinduoduoProductName, merchantId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      createdAt,
      product.pinduoduoProductId || '',
      product.pinduoduoProductImage || '',
      product.productName,
      product.pinduoduoProductName || '',
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
      merchantId: row.merchantId
    };
  }

  // ==================== Product Sales Orders ====================

  async insertProductSalesOrder(order: Omit<ProductSalesOrder, 'id' | 'createdAt'>): Promise<ProductSalesOrder> {
    if (!this.db) throw new Error('Database not initialized');

    const createdAt = new Date().toISOString();

    const result = await this.db.run(
      `INSERT INTO product_sales_orders (
        createdAt, shopName, shopId, productId, productName, productImage,
        salesArea, warehouseInfo, salesDate, salesSpec,
        totalStock, estimatedSales, totalSales, salesQuantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      createdAt,
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
      createdAt,
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

  private rowToProductSalesOrder(row: any): ProductSalesOrder {
    return {
      id: row.id.toString(),
      createdAt: row.createdAt,
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