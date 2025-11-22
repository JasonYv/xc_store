import { Merchant } from './types';

const STORAGE_KEY = 'merchants';

export const storage = {
  // 获取所有商家数据
  getMerchants: (): Merchant[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // 保存所有商家数据
  saveMerchants: (merchants: Merchant[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merchants));
    } catch (error) {
      console.error('Error saving merchants:', error);
    }
  },

  // 添加商家
  addMerchant: (merchant: Merchant): void => {
    const merchants = storage.getMerchants();
    merchants.push(merchant);
    storage.saveMerchants(merchants);
  },

  // 更新商家
  updateMerchant: (merchant: Merchant): void => {
    const merchants = storage.getMerchants();
    const index = merchants.findIndex(m => m.id === merchant.id);
    if (index !== -1) {
      merchants[index] = merchant;
      storage.saveMerchants(merchants);
    }
  },

  // 删除商家
  deleteMerchant: (id: string): void => {
    const merchants = storage.getMerchants();
    const filtered = merchants.filter(m => m.id !== id);
    storage.saveMerchants(filtered);
  }
}; 