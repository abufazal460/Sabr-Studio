import { Retail, inMemoryRetail } from '../models/retail.model.js';
import { slugify } from './project.service.js';

export const retailService = {
  /**
   * Get public retail items (published AND available only)
   * References: DATABASE.md §2.2; prompts/06-features.md §4.3
   */
  async getPublicRetail(filter = {}) {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const query = { published: true, availability: true };
      if (filter.category && filter.category !== 'All') {
        query.category = new RegExp(`^${filter.category}$`, 'i');
      }
      return await Retail.find(query).sort({ createdAt: -1 }).lean();
    }

    let items = inMemoryRetail.filter(
      (r) => r.published && r.availability !== false && r.inStock !== false
    );
    if (filter.category && filter.category !== 'All') {
      items = items.filter(
        (r) => r.category?.toLowerCase() === filter.category.toLowerCase()
      );
    }
    return items;
  },

  /**
   * Get public retail item by slug (published AND available only)
   */
  async getPublicRetailBySlug(slug) {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      return await Retail.findOne({
        $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
        published: true,
        availability: true,
      }).lean();
    }

    const item = inMemoryRetail.find(
      (r) =>
        (r.slug === slug || r.id === slug || r._id === slug) &&
        r.published &&
        r.availability !== false &&
        r.inStock !== false
    );
    return item || null;
  },

  /**
   * Get all retail items for admin
   */
  async getAdminRetail() {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      return await Retail.find().sort({ createdAt: -1 }).lean();
    }
    return [...inMemoryRetail];
  },

  /**
   * Get retail item by ID for admin
   */
  async getAdminRetailById(id) {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      return await Retail.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
      }).lean();
    }
    return inMemoryRetail.find((r) => r.id === id || r._id === id || r.slug === id) || null;
  },

  /**
   * Create retail item (admin only)
   */
  async createRetailItem(data) {
    const generatedSlug = slugify(data.title || `item-${Date.now()}`);

    const retailData = {
      title: data.title,
      slug: generatedSlug,
      category: data.category || 'Chair',
      description: data.description || '',
      price: Number(data.price) || 0,
      images: Array.isArray(data.images) ? data.images : [],
      image:
        data.image ||
        (Array.isArray(data.images) && data.images[0]?.url) ||
        '',
      dimensions: data.dimensions || '',
      materials: data.materials || '',
      availability: data.availability !== undefined ? Boolean(data.availability) : true,
      inStock: data.inStock !== undefined ? Boolean(data.inStock) : true,
      published: data.published !== undefined ? Boolean(data.published) : false,
    };

    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Retail.create(retailData);
      return doc.toObject();
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
    const { slug, _id, id: rawId, createdAt, ...allowedUpdates } = updateData;

    if (allowedUpdates.price !== undefined) {
      allowedUpdates.price = Number(allowedUpdates.price);
    }
    if (allowedUpdates.availability !== undefined) {
      allowedUpdates.availability = Boolean(allowedUpdates.availability);
      allowedUpdates.inStock = allowedUpdates.availability;
    }
    if (allowedUpdates.inStock !== undefined) {
      allowedUpdates.inStock = Boolean(allowedUpdates.inStock);
      allowedUpdates.availability = allowedUpdates.inStock;
    }
    if (allowedUpdates.published !== undefined) {
      allowedUpdates.published = Boolean(allowedUpdates.published);
    }

    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const updated = await Retail.findOneAndUpdate(
        { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }] },
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      ).lean();
      return updated;
    }

    const index = inMemoryRetail.findIndex(
      (r) => r.id === id || r._id === id || r.slug === id
    );
    if (index === -1) return null;

    inMemoryRetail[index] = {
      ...inMemoryRetail[index],
      ...allowedUpdates,
      updatedAt: new Date(),
    };
    return inMemoryRetail[index];
  },

  /**
   * Delete retail item (admin only)
   */
  async deleteRetailItem(id) {
    const isMongoConnected = Retail.db?.readyState === 1;
    if (isMongoConnected) {
      const doc = await Retail.findOneAndDelete({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
      }).lean();
      return !!doc;
    }

    const initialLength = inMemoryRetail.length;
    const filtered = inMemoryRetail.filter(
      (r) => r.id !== id && r._id !== id && r.slug !== id
    );
    if (filtered.length < initialLength) {
      inMemoryRetail.length = 0;
      inMemoryRetail.push(...filtered);
      return true;
    }
    return false;
  },
};
