import { body, validationResult } from 'express-validator';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Order validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

export const checkoutValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Cart items must be a non-empty array'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  handleValidationErrors,
];

export const verifyPaymentValidator = [
  body().custom((value, { req }) => {
    if (!req.body.orderId && !req.body.razorpayOrderId) {
      throw new Error('Either orderId or razorpayOrderId must be provided');
    }
    return true;
  }),
  handleValidationErrors,
];

export const updateOrderStatusValidator = [
  body('orderStatus')
    .notEmpty()
    .withMessage('orderStatus is required')
    .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
    .withMessage('orderStatus must be one of: pending, confirmed, completed, cancelled'),
  body('paymentStatus').custom((value) => {
    if (value !== undefined) {
      throw new Error(
        'paymentStatus cannot be modified by admin. It is strictly controlled by payment verification.'
      );
    }
    return true;
  }),
  body('amount').custom((value) => {
    if (value !== undefined) {
      throw new Error('Order amount is immutable and cannot be updated.');
    }
    return true;
  }),
  handleValidationErrors,
];
