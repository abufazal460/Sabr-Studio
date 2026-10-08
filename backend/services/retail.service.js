import { Retail, RetailCategory, inMemoryRetail, inMemoryCategories } from '../models/retail.model.js';
import { slugify } from './project.service.js';

export const retailService = {
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
        return dbItems.map((doc) => ({
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

    return items;
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
      if (item) return { ...item, id: item._id.toString() };
    }

    const item = inMemoryRetail.find(
      (r) =>
        (r.slug === slug || r.id === slug || r._id === slug) &&
        r.published === true
    );
    return item || null;
  },

  /**
   * Get all retail items for admin
   */
  async getAdminRetail() {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const docs = await Retail.find().sort({ createdAt: -1 }).lean();
      return docs.map((doc) => ({
        ...doc,
        id: doc._id.toString(),
      }));
    }
    return inMemoryRetail.map((item) => ({
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
      dimensions: String(data.dimensions || '').trim(),
      materials: String(data.materials || '').trim(),
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

    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Retail.create(retailData);
      const obj = doc.toObject();
      return { ...obj, id: obj._id.toString() };
    }

    const newItem = {
      ...retailData,
      _id: `prod-${Date.now()}`,
      id: `prod-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryRetail.unshift(newItem);
    return newItem;
  },

  /**
   * Update retail item (admin only)
   */
  async updateRetailItem(id, updateData) {
    const cleanId = String(id || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      return null;
    }
    const { slug, _id, id: rawId, createdAt, ...allowedUpdates } = updateData;

    if (allowedUpdates.price !== undefined && allowedUpdates.price !== null) {
      allowedUpdates.price = Number(allowedUpdates.price);
    }
    if (allowedUpdates.title !== undefined) {
      allowedUpdates.title = String(allowedUpdates.title).trim();
    }
    if (allowedUpdates.category !== undefined) {
      allowedUpdates.category = String(allowedUpdates.category).trim();
    }
    if (allowedUpdates.description !== undefined) {
      allowedUpdates.description = String(allowedUpdates.description).trim();
    }
    if (allowedUpdates.dimensions !== undefined) {
      allowedUpdates.dimensions = String(allowedUpdates.dimensions).trim();
    }
    if (allowedUpdates.materials !== undefined) {
      allowedUpdates.materials = String(allowedUpdates.materials).trim();
    }
    if (allowedUpdates.image !== undefined) {
      allowedUpdates.image = String(allowedUpdates.image).trim();
    }
    if (allowedUpdates.availability !== undefined) {
      allowedUpdates.availability = Boolean(allowedUpdates.availability);
    }
    if (allowedUpdates.inStock !== undefined) {
      allowedUpdates.inStock = Boolean(allowedUpdates.inStock);
    }
    if (allowedUpdates.published !== undefined) {
      allowedUpdates.published = Boolean(allowedUpdates.published);
    }
    if (Array.isArray(allowedUpdates.images)) {
      allowedUpdates.images = allowedUpdates.images.map((img) => ({
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
      const updated = await Retail.findOneAndUpdate(
        filter,
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      ).lean();
      if (updated) {
        return { ...updated, id: updated._id.toString() };
      }
      return null;
    }

    const index = inMemoryRetail.findIndex(
      (r) => r.id === cleanId || r._id === cleanId || r.slug === cleanId
    );
    if (index === -1) return null;

    inMemoryRetail[index] = {
      ...inMemoryRetail[index],
      ...allowedUpdates,
      updatedAt: new Date(),
    };
    return { ...inMemoryRetail[index], id: inMemoryRetail[index]._id || inMemoryRetail[index].id };
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
      return !!doc;
    }

    const initialLength = inMemoryRetail.length;
    const filtered = inMemoryRetail.filter(
      (r) => r.id !== cleanId && r._id !== cleanId && r.slug !== cleanId
    );
    if (filtered.length < initialLength) {
      inMemoryRetail.length = 0;
      inMemoryRetail.push(...filtered);
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
