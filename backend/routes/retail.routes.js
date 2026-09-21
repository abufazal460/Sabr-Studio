import express from 'express';
import { retailController } from '../controllers/retail.controller.js';
import { protect } from '../middlewares/protect.middleware.js';
import {
  createRetailValidator,
  updateRetailValidator,
} from '../validators/retail.validator.js';

const router = express.Router();

/**
 * Public Retail Routes
 * References: API.md §2.3, prompts/06-features.md §4.3
 */
router.get('/', (req, res) => retailController.getPublicRetail(req, res));
router.get('/:slug', (req, res) => retailController.getPublicRetailBySlug(req, res));

/**
 * Admin Retail Routes (Protected)
 * References: API.md §2.3, prompts/06-features.md §5.4
 */
router.get('/admin/retail', protect, (req, res) => retailController.getAdminRetail(req, res));
router.get('/admin/retail/:id', protect, (req, res) => retailController.getAdminRetailById(req, res));
router.post(
  '/admin/retail',
  protect,
  createRetailValidator,
  (req, res) => retailController.createRetailItem(req, res)
);
router.put(
  '/admin/retail/:id',
  protect,
  updateRetailValidator,
  (req, res) => retailController.updateRetailItem(req, res)
);
router.delete('/admin/retail/:id', protect, (req, res) =>
  retailController.deleteRetailItem(req, res)
);

export default router;
