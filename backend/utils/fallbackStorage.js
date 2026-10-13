/**
 * Persistent Fallback Storage
 *
 * PRODUCTION POLICY: Fallback storage is DISABLED in production. The app must
 * never silently serve demo/in-memory data or write to /tmp when Atlas is down.
 * API calls that need the DB will receive a 503 from the middleware in app.js.
 *
 * DEVELOPMENT: When MongoDB is unavailable locally, critical data is persisted
 * to JSON files so local work can proceed without Atlas.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns true when fallback/in-memory data stores should be used.
 * In production this is always false — the DB middleware returns 503 instead.
 */
export function isFallbackEnabled() {
  return process.env.NODE_ENV !== 'production';
}

function resolveFallbackDir() {
  // Production: never resolve a fallback directory
  if (!isFallbackEnabled()) return null;

  if (process.env.FALLBACK_DIR) return process.env.FALLBACK_DIR;
  // In development on Vercel-like environments, use /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'sabr-studio-fallback');
  }
  const rootFallback = path.join(__dirname, '../../data/fallback');
  if (fs.existsSync(rootFallback)) return rootFallback;
  return path.join(__dirname, '../data/fallback');
}

let persistenceEnabled = isFallbackEnabled();
const fallbackDir = resolveFallbackDir();

if (fallbackDir && persistenceEnabled) {
  try {
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
  } catch (err) {
    persistenceEnabled = false;
    console.error(
      `[FallbackStorage] Directory not writable (${fallbackDir}): ${err.message}. Running in in-memory mode.`
    );
  }
}

class FallbackStorage {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.filePath = fallbackDir ? path.join(fallbackDir, `${collectionName}.json`) : null;
    this.data = this._load();
  }

  _load() {
    if (!persistenceEnabled || !this.filePath) return [];
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
    if (!persistenceEnabled || !this.filePath) return false; // in-memory only (serverless / read-only fs)
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[FallbackStorage:${this.collectionName}] Save error:`, err.message);
      return false;
    }
  }

  findAll() {
    if (!isFallbackEnabled()) return [];
    return [...this.data];
  }

  findOne(query) {
    if (!isFallbackEnabled()) return null;
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
    if (!isFallbackEnabled()) return null;
    const generatedId = record._id || record.id || `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRecord = {
      ...record,
      _id: record._id || generatedId,
      id: record.id || generatedId,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.unshift(newRecord);
    this._save();
    return newRecord;
  }

  update(id, updates) {
    if (!isFallbackEnabled()) return null;
    const index = this.data.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;
    this.data[index] = { ...this.data[index], ...updates, updatedAt: new Date().toISOString() };
    this._save();
    return this.data[index];
  }

  delete(id) {
    if (!isFallbackEnabled()) return false;
    const len = this.data.length;
    this.data = this.data.filter(item => item._id !== id && item.id !== id);
    if (this.data.length < len) {
      this._save();
      return true;
    }
    return false;
  }

  count() {
    if (!isFallbackEnabled()) return 0;
    return this.data.length;
  }

  clear() {
    if (!isFallbackEnabled()) return;
    this.data = [];
    this._save();
  }
}

export const fallbackOrders = new FallbackStorage('orders');
export const fallbackEnquiries = new FallbackStorage('enquiries');

export function hasFallbackData(collectionName) {
  if (!isFallbackEnabled() || !fallbackDir) return false;
  const filePath = path.join(fallbackDir, `${collectionName}.json`);
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

export function getFallbackCount(collectionName) {
  if (!isFallbackEnabled()) return 0;
  return new FallbackStorage(collectionName).count();
}

export function clearAllFallbackData() {
  if (!isFallbackEnabled() || !fallbackDir) return false;
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