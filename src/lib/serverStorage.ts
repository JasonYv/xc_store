import fs from 'fs';
import path from 'path';
import { Merchant } from './types';

const DATA_FILE = path.join(process.cwd(), 'data', 'merchants.json');

if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ merchants: [] }, null, 2));
}

export const serverStorage = {
  getMerchants: (): Merchant[] => {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const jsonData = JSON.parse(data);
      return jsonData.merchants;
    } catch (error) {
      console.error('Error reading merchants data:', error);
      return [];
    }
  },

  saveMerchants: (merchants: Merchant[]): void => {
    try {
      const jsonData = { merchants };
      fs.writeFileSync(DATA_FILE, JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error('Error saving merchants data:', error);
    }
  },

  addMerchant: (merchant: Merchant): void => {
    const merchants = serverStorage.getMerchants();
    merchants.push(merchant);
    serverStorage.saveMerchants(merchants);
  },

  updateMerchant: (merchant: Merchant): void => {
    const merchants = serverStorage.getMerchants();
    const index = merchants.findIndex(m => m.id === merchant.id);
    if (index !== -1) {
      merchants[index] = merchant;
      serverStorage.saveMerchants(merchants);
    }
  },

  deleteMerchant: (id: string): void => {
    const merchants = serverStorage.getMerchants();
    const filtered = merchants.filter(m => m.id !== id);
    serverStorage.saveMerchants(filtered);
  }
}; 