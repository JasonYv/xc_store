import fs from 'fs';
import path from 'path';
import { Merchant } from './types';

// SQLite模拟类，基于JSON文件存储，但提供SQL类似的接口
export class Database {
  private dbFilePath: string;
  private data: { merchants: Merchant[] } = { merchants: [] };

  constructor() {
    this.dbFilePath = path.join(process.cwd(), 'data/merchants.json');
    this.initDatabase();
  }

  private initDatabase() {
    try {
      if (!fs.existsSync(path.dirname(this.dbFilePath))) {
        fs.mkdirSync(path.dirname(this.dbFilePath), { recursive: true });
      }

      if (!fs.existsSync(this.dbFilePath)) {
        fs.writeFileSync(this.dbFilePath, JSON.stringify({ merchants: [] }, null, 2));
      }

      const rawData = fs.readFileSync(this.dbFilePath, 'utf8');
      this.data = JSON.parse(rawData);
    } catch (error) {
      console.error('Database initialization error:', error);
      this.data = { merchants: [] };
    }
  }

  private saveDatabase() {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
      throw new Error('Failed to save database');
    }
  }

  // CREATE
  async insertMerchant(merchant: Omit<Merchant, 'id' | 'createdAt'>): Promise<Merchant> {
    const newMerchant: Merchant = {
      ...merchant,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    this.data.merchants.push(newMerchant);
    this.saveDatabase();
    return newMerchant;
  }

  // READ
  async getMerchantById(id: string): Promise<Merchant | null> {
    const merchant = this.data.merchants.find(m => m.id === id);
    return merchant || null;
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return [...this.data.merchants];
  }

  async getMerchantsPaginated(page: number, pageSize: number, search?: string): Promise<{
    items: Merchant[],
    total: number,
    page: number,
    pageSize: number,
    totalPages: number
  }> {
    let filteredMerchants = this.data.merchants;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMerchants = filteredMerchants.filter(merchant => 
        merchant.name.toLowerCase().includes(searchLower) ||
        merchant.groupName.toLowerCase().includes(searchLower)
      );
    }
    
    const total = filteredMerchants.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = filteredMerchants.slice(startIndex, endIndex);
    
    return {
      items,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  // UPDATE
  async updateMerchant(id: string, updatedData: Partial<Merchant>): Promise<Merchant | null> {
    const index = this.data.merchants.findIndex(m => m.id === id);
    if (index === -1) return null;

    const merchant = this.data.merchants[index];
    const updatedMerchant = {
      ...merchant,
      ...updatedData,
      id: merchant.id,
      createdAt: merchant.createdAt
    };

    this.data.merchants[index] = updatedMerchant;
    this.saveDatabase();
    return updatedMerchant;
  }

  // DELETE
  async deleteMerchant(id: string): Promise<boolean> {
    const initialLength = this.data.merchants.length;
    this.data.merchants = this.data.merchants.filter(m => m.id !== id);
    
    if (initialLength !== this.data.merchants.length) {
      this.saveDatabase();
      return true;
    }
    
    return false;
  }

  // 模拟事务
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const backupData = JSON.stringify(this.data);
    try {
      const result = await callback();
      return result;
    } catch (error) {
      // 回滚
      this.data = JSON.parse(backupData);
      throw error;
    }
  }
}

// 创建单例实例
const db = new Database();
export default db; 