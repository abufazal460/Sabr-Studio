/**
 * Persistent Fallback Storage
 * When MongoDB is unavailable, critical data is persisted to JSON files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fallbackDir = path.join(__dirname, '../data/fallback');

if (!fs.existsSync(fallbackDir)) {
  fs.mkdirSync(fallbackDir, { recursive: true });
}

class FallbackStorage {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.filePath = path.join(fallbackDir, `${collectionName}.json`);
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (err) {
      console.error(`[FallbackStorage:${this.collectionName}] Load error:`, err.message);
    }
    return [];
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[FallbackStorage:${this.collectionName}] Save error:`, err.message);
      return false;
    }
  }

  findAll() {
    return [...this.data];
  }

  findOne(query) {
    if (query._id || query.id) {
      const id = query._id || query.id;
      return this.data.find(item => item._id === id || item.id === id) || null;
    }
    if (query.orderNumber) {
      return this.data.find(item => item.orderNumber === query.orderNumber) || null;
    }
    return null;
  }

  add(record) {
    const newRecord = {
      ...record,
      _id: record._id || `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      id: record.id || `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.unshift(newRecord);
    this._save();
    return newRecord;
  }

  update(id, updates) {
    const index = this.data.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;
    this.data[index] = { ...this.data[index], ...updates, updatedAt: new Date().toISOString() };
    this._save();
    return this.data[index];
  }

  delete(id) {
    const len = this.data.length;
    this.data = this.data.filter(item => item._id !== id && item.id !== id);
    if (this.data.length < len) {
      this._save();
      return true;
    }
    return false;
  }

  count() {
    return this.data.length;
  }

  clear() {
    this.data = [];
    this._save();
  }
}

export const fallbackOrders = new FallbackStorage('orders');
export const fallbackEnquiries = new FallbackStorage('enquiries');

export function hasFallbackData(collectionName) {
  const filePath = path.join(fallbackDir, `${collectionName}.json`);
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

export function getFallbackCount(collectionName) {
  return new FallbackStorage(collectionName).count();
}

export function clearAllFallbackData() {
  try {
    if (fs.existsSync(fallbackDir)) {
      fs.rmSync(fallbackDir, { recursive: true, force: true });
      fs.mkdirSync(fallbackDir, { recursive: true });
      console.log('[FallbackStorage] All data cleared');
      return true;
    }
  } catch (err) {
    console.error('[FallbackStorage] Clear error:', err.message);
  }
  return false;
}

export async function syncFallbackToMongoose({ orders = false, enquiries = false } = {}) {
  const result = { 
    orders: { synced: 0, failed: 0, skipped: 0 }, 
    enquiries: { synced: 0, failed: 0, skipped: 0 } 
  };
  
  try {
    if (orders) {
      const { Order } = await import('../models/order.model.js');
      for (const record of fallbackOrders.findAll()) {
        try {
          const existing = await Order.findOne({ 
            $or: [{ _id: record._id }, { orderNumber: record.orderNumber }] 
          });
          if (existing) { result.orders.skipped++; continue; }
          await Order.create(record);
          result.orders.synced++;
        } catch (err) {
          console.error('[FallbackSync] Order error:', err.message);
          result.orders.failed++;
        }
      }
    }

    if (enquiries) {
      const { Enquiry } = await import('../models/enquiry.model.js');
      for (const record of fallbackEnquiries.findAll()) {
        try {
          const existing = await Enquiry.findOne({ 
            $or: [{ _id: record._id }, { id: record.id }] 
          });
          if (existing) { result.enquiries.skipped++; continue; }
          await Enquiry.create(record);
          result.enquiries.synced++;
        } catch (err) {
          console.error('[FallbackSync] Enquiry error:', err.message);
          result.enquiries.failed++;
        }
      }
    }
  } catch (err) {
    console.error('[FallbackSync] Sync error:', err.message);
  }

  return result;
}

export default FallbackStorage;