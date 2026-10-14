import { Retail, RetailCategory, inMemoryRetail, inMemoryCategories } from '../models/retail.model.js';
import { slugify } from './project.service.js';
import { collectPublicIds, deleteAssets } from './cloudinary.service.js';

/**
 * Normalize an incoming stock value to a non-negative integer, or null when the
 * caller intends "untracked" (legacy behaviour, no counter). Used by both
 * create and update so admin input can never persist a fractional/negative
 * counter.
 */
function normalizeStock(value) {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

export const retailService = {
  /**
   * Normalize a product for API output: derive `inStock` from the real `stock`
   * counter whenever stock is present, so the public API reflects inventory
   * immediately. Legacy documents without a `stock` value keep their boolean.
   */
  _withDerivedStock(item) {
    if (!item || typeof item !== 'object') return item;
    if (item.stock === null || item.stock === undefined) {
      // Legacy/untracked: keep the boolean authoritative.
      return { ...item, inStock: item.inStock !== false && item.availability !== false };
    }
    const inStock = Number(item.stock) > 0;
    return { ...item, stock: Number(item.stock), inStock, availability: inStock };
  },

  /**
   * Atomically reserve stock for a set of retail line items.
   *
   * Each reservation is a conditional `findOneAndUpdate` with a `$gte` guard
   * followed by `$inc`, so two concurrent checkouts can never drive stock below
   * zero. Legacy products (stock === null) are untracked and always succeed.
   * Returns { ok, reserved, failedItem } — on failure the caller must not
   * create an order, and any already-reserved lines must be released.
   */
  async reserveStock(items = []) {
    const lines = (items || []).filter((it) => it && it.itemType !== 'project');
    const reserved = [];
    for (const line of lines) {
      const qty = Number(line.quantity) || 0;
      const id = String(line.itemId || '').trim();
      if (!id || qty < 1) continue;
      const isMongoConnected = Retail.db?.readyState === 1;
      if (isMongoConnected) {
        let doc;
        try {
          doc = await Retail.findOneAndUpdate(
            { _id: id, stock: { $ne: null, $gte: qty } },
            { $inc: { stock: -qty } },
            { new: true }
          ).lean();
        } catch (e) {
          doc = null;
        }
        if (!doc) {
          // Either not found, untracked, or not enough stock left.
          const current = await Retail.findById(id).lean().catch(() => null);
          if (!current) return { ok: false, reserved, failedItem: { id, name: line.name, reason: 'unavailable' } };
          if (current.stock === null || current.stock === undefined) {
            // Untracked legacy item — no counter to decrement.
            continue;
          }
          return {
            ok: false,
            reserved,
            failedItem: {
              id,
              name: current.title || line.name,
              reason: 'out_of_stock',
              available: Number(current.stock) || 0,
            },
          };
        }
        reserved.push({ id, quantity: qty });
      } else {
        const idx = inMemoryRetail.findIndex((r) => r.id === id || r._id === id || r.slug === id);
        if (idx === -1) return { ok: false, reserved, failedItem: { id, name: line.name, reason: 'unavailable' } };
        const rec = inMemoryRetail[idx];
        if (rec.stock === null || rec.stock === undefined) continue; // untracked
        const next = Number(rec.stock) - qty;
        if (next < 0) {
          return { ok: false, reserved, failedItem: { id, name: rec.title, reason: 'out_of_stock', available: Number(rec.stock) || 0 } };
        }
        rec.stock = next;
        rec.inStock = next > 0;
        rec.availability = next > 0;
        rec.updatedAt = new Date();
        reserved.push({ id, quantity: qty });
      }
    }
    return { ok: true, reserved, failedItem: null };
  },

  /**
   * Release previously reserved stock (best-effort). Used when a payment fails
   * or an order is cancelled so inventory is never lost. Never throws.
   */
  async releaseStock(reservations = []) {
    for (const res of reservations || []) {
      const id = String(res.id || '').trim();
      const qty = Number(res.quantity) || 0;
      if (!id || qty < 1) continue;
      const isMongoConnected = Retail.db?.readyState === 1;
      try {
        if (isMongoConnected) {
          await Retail.updateOne(
            { _id: id, stock: { $ne: null } },
            [{ $set: { stock: { $add: ['$stock', qty] }, inStock: { $gt: [{ $add: ['$stock', qty] }, 0] }, availability: { $gt: [{ $add: ['$stock', qty] }, 0] } } }]
          );
        } else {
          const idx = inMemoryRetail.findIndex((r) => r.id === id || r._id === id || r.slug === id);
          if (idx !== -1) {
            const rec = inMemoryRetail[idx];
            if (rec.stock === null || rec.stock === undefined) continue;
            rec.stock = Number(rec.stock) + qty;
            rec.inStock = rec.stock > 0;
            rec.availability = rec.stock > 0;
            rec.updatedAt = new Date();
          }
        }
      } catch (e) {
        // Best-effort: cleanup must never break the caller.
      }
    }
    return true;
  },
  /**
   * Get public retail items (published only - in stock and out of stock are both shown)
   * References: DATABASE.md §2.2; prompts/06-features.md §4.3
   */
  async getPublicRetail(filter = {}) {
    const isMongoConnected = Retail.db?.readyState === 1;

    if (isMongoConnected) {
      const query = {
        published: true,
      };

      if (filter?.category && filter.category !== 'All') {
        query.category = new RegExp(
          `^${filter.category.trim()}$`,
          'i'
        );
      }

      const dbItems = await Retail.find(query)
        .sort({ createdAt: -1 })
        .lean();
      if (dbItems && dbItems.length) {
        return dbItems.map((doc) => this._withDerivedStock({
          ...doc,
          id: doc._id.toString(),
        }));
      }
    }

    let items = inMemoryRetail.filter(
      (item) => item.published === true
    );

    if (filter?.category && filter.category !== 'All') {
      const category = filter.category.trim().toLowerCase();

      items = items.filter(
        (item) =>
          item.category?.trim().toLowerCase() === category
      );
    }

    return items.map((item) => this._withDerivedStock(item));
  },

  /**
   * Get public retail item by slug (published only)
   */
  async getPublicRetailBySlug(slug) {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const item = await Retail.findOne({
        $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
        published: true,
      }).lean();
      if (item) return this._withDerivedStock({ ...item, id: item._id.toString() });
    }

    const item = inMemoryRetail.find(
      (r) =>
        (r.slug === slug || r.id === slug || r._id === slug) &&
        r.published === true
    );
    return item ? this._withDerivedStock(item) : null;
  },

  /**
   * Get all retail items for admin
   */
  async getAdminRetail() {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const docs = await Retail.find().sort({ createdAt: -1 }).lean();
      return docs.map((doc) => this._withDerivedStock({
        ...doc,
        id: doc._id.toString(),
      }));
    }
    return inMemoryRetail.map((item) => this._withDerivedStock({
      ...item,
      id: (item._id || item.id).toString(),
    }));
  },

  /**
   * Get retail item by ID for admin
   */
  async getAdminRetailById(id) {
    const cleanId = String(id || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      return null;
    }
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
      const query = isObjectId ? { _id: cleanId } : { slug: cleanId };
      const item = await Retail.findOne(query).lean();
      if (item) {
        return { ...item, id: item._id.toString() };
      }
    }
    return (
      inMemoryRetail.find((r) => r.id === cleanId || r._id === cleanId || r.slug === cleanId) || null
    );
  },

  /**
   * Create retail item (admin only)
   */
  async createRetailItem(data) {
    const title = String(data.title || '').trim();
    const generatedSlug = slugify(title || `item-${Date.now()}`);

    const retailData = {
      title,
      slug: generatedSlug,
      category: String(data.category || 'Chair').trim(),
      description: String(data.description || '').trim(),
      price: Number(data.price) || 0,
      images: Array.isArray(data.images)
        ? data.images.map((img) => ({
            url: typeof img === 'string' ? img.trim() : String(img?.url || '').trim(),
            publicId: typeof img === 'string' ? '' : String(img?.publicId || '').trim(),
          }))
        : data.image
        ? [{ url: String(data.image).trim(), publicId: '' }]
        : [],
      image:
        String(data.image || '').trim() ||
        (Array.isArray(data.images) && data.images[0]?.url) ||
        '',
      imagePublicId: String(data.imagePublicId || '').trim(),
      dimensions: String(data.dimensions || '').trim(),
      materials: String(data.materials || '').trim(),
      // Real inventory counter (Work 05). `stock` (integer >= 0) is the source
      // of truth; `inStock`/`availability` are derived from it so the public
      // API reflects it immediately. A null/omitted stock stays untracked
      // (legacy behaviour driven purely by the inStock boolean).
      stock: normalizeStock(data.stock),
      availability:
        data.availability !== undefined
          ? Boolean(data.availability)
          : data.inStock !== undefined
          ? Boolean(data.inStock)
          : true,
      inStock:
        data.inStock !== undefined
          ? Boolean(data.inStock)
          : data.availability !== undefined
          ? Boolean(data.availability)
          : true,
      published: Boolean(data.published),
    };
    if (retailData.stock !== null) {
      retailData.inStock = retailData.stock > 0;
      retailData.availability = retailData.stock > 0;
    }

    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Retail.create(retailData);
      const obj = doc.toObject();
      return this._withDerivedStock({ ...obj, id: obj._id.toString() });
    }

    const newItem = {
      ...retailData,
      _id: `prod-${Date.now()}`,
      id: `prod-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryRetail.unshift(newItem);
    return this._withDerivedStock(newItem);
  },

  /**
   * Update retail item (admin only)
   */
  async updateRetailItem(id, updateData) {
    const cleanId = String(id || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      return null;
    }
    // Strict allow-list: client-sent role, amount, isPaid, paymentStatus, status, etc. are completely ignored
    const allowedUpdates = {};
    if (updateData.price !== undefined && updateData.price !== null) {
      allowedUpdates.price = Number(updateData.price);
    }
    if (updateData.title !== undefined) {
      allowedUpdates.title = String(updateData.title).trim();
    }
    if (updateData.category !== undefined) {
      allowedUpdates.category = String(updateData.category).trim();
    }
    if (updateData.description !== undefined) {
      allowedUpdates.description = String(updateData.description).trim();
    }
    if (updateData.dimensions !== undefined) {
      allowedUpdates.dimensions = String(updateData.dimensions).trim();
    }
    if (updateData.materials !== undefined) {
      allowedUpdates.materials = String(updateData.materials).trim();
    }
    if (updateData.image !== undefined) {
      allowedUpdates.image = String(updateData.image).trim();
    }
    if (updateData.imagePublicId !== undefined) {
      allowedUpdates.imagePublicId = String(updateData.imagePublicId || '').trim();
    }
    if (updateData.availability !== undefined) {
      allowedUpdates.availability = Boolean(updateData.availability);
    }
    if (updateData.inStock !== undefined) {
      allowedUpdates.inStock = Boolean(updateData.inStock);
    }
    // Real inventory counter (Work 05). When the admin supplies `stock`, it
    // becomes authoritative and `inStock`/`availability` are derived from it so
    // the public API reflects the change immediately. An explicit boolean
    // (stock toggle) is still honoured for legacy untracked products.
    if (updateData.stock !== undefined) {
      const stock = normalizeStock(updateData.stock);
      allowedUpdates.stock = stock;
      if (stock !== null) {
        allowedUpdates.inStock = stock > 0;
        allowedUpdates.availability = stock > 0;
      }
    }
    if (updateData.published !== undefined) {
      allowedUpdates.published = Boolean(updateData.published);
    }
    if (Array.isArray(updateData.images)) {
      allowedUpdates.images = updateData.images.map((img) => ({
        url: typeof img === 'string' ? img.trim() : String(img?.url || '').trim(),
        publicId: typeof img === 'string' ? '' : String(img?.publicId || '').trim(),
      }));
      if (!allowedUpdates.image && allowedUpdates.images[0]?.url) {
        allowedUpdates.image = allowedUpdates.images[0].url;
      }
    } else if (allowedUpdates.image) {
      if (!allowedUpdates.images || allowedUpdates.images.length === 0) {
        allowedUpdates.images = [{ url: allowedUpdates.image, publicId: '' }];
      }
    }

    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
      const filter = isObjectId ? { _id: cleanId } : { slug: cleanId };
      // Read the previous document so a replaced image can be cleaned up.
      const previous = await Retail.findOne(filter).lean();
      const updated = await Retail.findOneAndUpdate(
        filter,
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      ).lean();
      if (updated) {
        // Best-effort: cleanup never breaks the update (deleteAssets never throws).
        await cleanupReplacedAssets(previous, allowedUpdates);
        return this._withDerivedStock({ ...updated, id: updated._id.toString() });
      }
      return null;
    }

    const index = inMemoryRetail.findIndex(
      (r) => r.id === cleanId || r._id === cleanId || r.slug === cleanId
    );
    if (index === -1) return null;

    const previous = inMemoryRetail[index];
    inMemoryRetail[index] = {
      ...inMemoryRetail[index],
      ...allowedUpdates,
      updatedAt: new Date(),
    };
    await cleanupReplacedAssets(previous, allowedUpdates);
    return this._withDerivedStock({
      ...inMemoryRetail[index],
      id: inMemoryRetail[index]._id || inMemoryRetail[index].id,
    });
  },

  /**
   * Delete retail item (admin only)
   */
  async deleteRetailItem(id) {
    const cleanId = String(id || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      return false;
    }
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanId);
      const filter = isObjectId ? { _id: cleanId } : { slug: cleanId };
      const doc = await Retail.findOneAndDelete(filter).lean();
      if (!doc) return false;
      // Best-effort media cleanup after the record is already gone.
      await deleteAssets(collectPublicIds(doc));
      return true;
    }

    const initialLength = inMemoryRetail.length;
    const removed = inMemoryRetail.filter(
      (r) => r.id === cleanId || r._id === cleanId || r.slug === cleanId
    );
    const filtered = inMemoryRetail.filter(
      (r) => r.id !== cleanId && r._id !== cleanId && r.slug !== cleanId
    );
    if (filtered.length < initialLength) {
      inMemoryRetail.length = 0;
      inMemoryRetail.push(...filtered);
      for (const doc of removed) await deleteAssets(collectPublicIds(doc));
      return true;
    }
    return false;
  },

  /**
   * Get all categories (stored categories + active product categories)
   */
  async getCategories() {
    const isMongoConnected = Retail.db?.readyState === 1;
    let dbCats = [];
    let productCats = [];

    if (isMongoConnected) {
      const [customCats, distinctCats] = await Promise.all([
        RetailCategory.find().lean(),
        Retail.distinct('category'),
      ]);
      dbCats = (customCats || []).map((c) => c.name);
      productCats = distinctCats || [];
    } else {
      productCats = inMemoryRetail.map((r) => r.category).filter(Boolean);
      dbCats = [...inMemoryCategories];
    }

    const standardCats = ['Chair', 'Table', 'Lighting', 'Storage', 'Decor', 'Sofa', 'Objects'];
    const merged = Array.from(
      new Set(
        [...standardCats, ...dbCats, ...productCats]
          .map((c) => String(c || '').trim())
          .filter(Boolean)
      )
    );
    return merged;
  },

  /**
   * Create a new category
   */
  async createCategory(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      const error = new Error('Category name is required');
      error.statusCode = 400;
      throw error;
    }

    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const existing = await RetailCategory.findOne({
        name: new RegExp(`^${cleanName}$`, 'i'),
      }).lean();
      if (existing) return existing;

      const created = await RetailCategory.create({
        name: cleanName,
        slug: slugify(cleanName),
      });
      return created.toObject();
    }

    const exists = inMemoryCategories.some(
      (c) => c.toLowerCase() === cleanName.toLowerCase()
    );
    if (!exists) {
      inMemoryCategories.push(cleanName);
    }
    return { name: cleanName, slug: slugify(cleanName) };
  },

  /**
   * Delete category (and optionally cascade delete all products belonging to it)
   */
  async deleteCategory(name, { cascade = false } = {}) {
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      const error = new Error('Category name is required');
      error.statusCode = 400;
      throw error;
    }

    const isMongoConnected = Retail.db?.readyState === 1;
    const catRegex = new RegExp(`^${cleanName}$`, 'i');

    if (isMongoConnected) {
      // Out of Stock products must also count!
      const productCount = await Retail.countDocuments({ category: catRegex });

      if (productCount > 0 && !cascade) {
        const error = new Error(
          'This category contains products. Remove or move the products first, or use Delete Products & Category.'
        );
        error.statusCode = 400;
        throw error;
      }

      if (cascade) {
        await Retail.deleteMany({ category: catRegex });
      }

      await RetailCategory.deleteMany({ name: catRegex });

      return {
        success: true,
        category: cleanName,
        deletedProducts: cascade ? productCount : 0,
      };
    }

    // In-memory fallback
    const productCount = inMemoryRetail.filter(
      (r) => (r.category || '').trim().toLowerCase() === cleanName.toLowerCase()
    ).length;

    if (productCount > 0 && !cascade) {
      const error = new Error(
        'This category contains products. Remove or move the products first, or use Delete Products & Category.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (cascade) {
      const remaining = inMemoryRetail.filter(
        (r) => (r.category || '').trim().toLowerCase() !== cleanName.toLowerCase()
      );
      inMemoryRetail.length = 0;
      inMemoryRetail.push(...remaining);
    }

    const catIdx = inMemoryCategories.findIndex(
      (c) => c.toLowerCase() === cleanName.toLowerCase()
    );
    if (catIdx !== -1) {
      inMemoryCategories.splice(catIdx, 1);
    }

    return {
      success: true,
      category: cleanName,
      deletedProducts: cascade ? productCount : 0,
    };
  },
};

/**
 * Delete the Cloudinary assets a retail update dropped (Work 04). Only public
 * IDs that existed before and are absent from the update are removed, so a
 * plain re-save or a stock toggle never destroys a live asset. Never throws.
 */
async function cleanupReplacedAssets(previous, allowedUpdates) {
  if (!previous) return { deleted: 0, failed: 0 };
  // Only run when this update actually carried image data. A stock/publish
  // toggle sends no images, and must never delete the existing assets.
  const sentImages = Array.isArray(allowedUpdates.images);
  const sentImagePublicId = allowedUpdates.imagePublicId !== undefined;
  if (!sentImages && !sentImagePublicId) return { deleted: 0, failed: 0 };

  const previousIds = collectPublicIds(previous);
  if (!previousIds.length) return { deleted: 0, failed: 0 };

  const kept = new Set();
  if (sentImages) {
    allowedUpdates.images.forEach((img) => {
      const id = String(img?.publicId || '').trim();
      if (id) kept.add(id);
    });
  }
  if (sentImagePublicId) {
    const id = String(allowedUpdates.imagePublicId || '').trim();
    if (id) kept.add(id);
  }

  const staleIds = previousIds.filter((id) => !kept.has(id));
  if (!staleIds.length) return { deleted: 0, failed: 0 };
  return deleteAssets(staleIds);
}
