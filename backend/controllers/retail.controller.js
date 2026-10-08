import { retailService } from '../services/retail.service.js';

export const retailController = {
  async getPublicRetail(req, res) {
    try {
      const items = await retailService.getPublicRetail(req.query);
      return res.status(200).json({
        success: true,
        data: items,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve retail catalog',
      });
    }
  },

  async getPublicRetailBySlug(req, res) {
    try {
      const slug = req.params?.slug || req.url.split('/').pop();
      const item = await retailService.getPublicRetailBySlug(slug);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `Product "${slug}" not found or unpublished`,
        });
      }
      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve retail product',
      });
    }
  },

  async getAdminRetail(req, res) {
    try {
      const items = await retailService.getAdminRetail();
      return res.status(200).json({
        success: true,
        data: items,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve retail items for admin',
      });
    }
  },

  async getAdminRetailById(req, res) {
    try {
      const id = req.params?.id || req.url.split('/').pop();
      const item = await retailService.getAdminRetailById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve retail item',
      });
    }
  },

  async createRetailItem(req, res) {
    try {
      const newItem = await retailService.createRetailItem(req.body);
      return res.status(201).json({
        success: true,
        data: newItem,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to create retail item',
      });
    }
  },

  async updateRetailItem(req, res) {
    try {
      const rawId = req.params?.id || req.url.split('/')[4] || req.url.split('/').pop();
      const id = String(rawId || '').split('?')[0].trim();
      const updated = await retailService.updateRetailItem(id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Retail item not found for update',
        });
      }
      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update retail item',
      });
    }
  },

  async deleteRetailItem(req, res) {
    try {
      const rawId = req.params?.id || req.url.split('/').pop();
      const id = String(rawId || '').split('?')[0].trim();
      const deleted = await retailService.deleteRetailItem(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Retail item not found for deletion',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Retail item deleted successfully',
        data: null,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to delete retail item',
      });
    }
  },

  async getCategories(req, res) {
    try {
      const categories = await retailService.getCategories();
      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve retail categories',
      });
    }
  },

  async createCategory(req, res) {
    try {
      const { name } = req.body || {};
      const category = await retailService.createCategory(name);
      return res.status(201).json({
        success: true,
        data: category,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to create category',
      });
    }
  },

  async deleteCategory(req, res) {
    try {
      const rawCategory = req.params?.category || req.url.split('/categories/')[1]?.split('?')[0];
      const category = decodeURIComponent(String(rawCategory || '').trim());
      const cascade =
        req.query?.cascade === 'true' ||
        req.query?.deleteAll === 'true' ||
        req.body?.cascade === true;

      const result = await retailService.deleteCategory(category, { cascade });
      return res.status(200).json({
        success: true,
        message: cascade
          ? `Category "${category}" and all its products were permanently deleted.`
          : `Category "${category}" was permanently deleted.`,
        data: result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to delete category',
      });
    }
  },
};
