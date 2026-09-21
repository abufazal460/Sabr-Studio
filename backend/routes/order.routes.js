import express from 'express';
import { orderController } from '../controllers/order.controller.js';
import { protect } from '../middlewares/protect.middleware.js';
import {
  checkoutValidator,
  verifyPaymentValidator,
  updateOrderStatusValidator,
} from '../validators/order.validator.js';

const router = express.Router();

/**
 * Public Checkout Routes
 * References: API.md §2.5, prompts/06-features.md §4.8
 */
router.post('/checkout', checkoutValidator, (req, res) =>
  orderController.checkout(req, res)
);
router.post('/verify', verifyPaymentValidator, (req, res) =>
  orderController.verifyPayment(req, res)
);

/**
 * Admin Order Routes (Protected)
 * References: API.md §2.6, prompts/06-features.md §5.6
 */
router.get('/admin/orders', protect, (req, res) =>
  orderController.getAdminOrders(req, res)
);
router.get('/admin/orders/:id', protect, (req, res) =>
  orderController.getAdminOrderById(req, res)
);
router.patch(
  '/admin/orders/:id/status',
  protect,
  updateOrderStatusValidator,
  (req, res) => orderController.updateOrderStatus(req, res)
);

export default router;
