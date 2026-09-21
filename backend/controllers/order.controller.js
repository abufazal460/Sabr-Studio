import { orderService } from '../services/order.service.js';

export const orderController = {
  /**
   * Initiate checkout session (public)
   */
  async checkout(req, res) {
    try {
      const session = await orderService.createCheckoutSession(req.body);
      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Checkout session generation failed',
      });
    }
  },

  /**
   * Verify Razorpay payment signature (public)
   */
  async verifyPayment(req, res) {
    try {
      const result = await orderService.verifyPayment(req.body);
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: result,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Payment verification failed',
      });
    }
  },

  /**
   * List all orders (strictly admin-only)
   */
  async getAdminOrders(req, res) {
    try {
      const orders = await orderService.getAdminOrders();
      return res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve orders',
      });
    }
  },

  /**
   * Get order by ID (strictly admin-only)
   */
  async getAdminOrderById(req, res) {
    try {
      const id = req.params?.id || req.url.split('/').pop();
      const order = await orderService.getAdminOrderById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve order',
      });
    }
  },

  /**
   * Update order status ONLY (strictly admin-only)
   * References: prompts/06-features.md §5.6
   * Rejects any attempt to write paymentStatus or amount.
   */
  async updateOrderStatus(req, res) {
    try {
      const id = req.params?.id || req.url.split('/')[4] || req.url.split('/')[3];
      const { orderStatus, status, ...disallowed } = req.body;
      const targetStatus = orderStatus || status;

      const updated = await orderService.updateOrderStatus(id, targetStatus, disallowed);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Order not found for status update',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: updated,
      });
    } catch (err) {
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || 'Failed to update order status',
      });
    }
  },
};
