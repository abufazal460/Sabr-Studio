import { body, validationResult } from 'express-validator';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

export const createRetailValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Retail product title is required')
    .isLength({ max: 200 }),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required'),
  body('category')
    .optional()
    .trim()
    .isString(),
  body('availability')
    .optional()
    .isBoolean()
    .withMessage('Availability must be a boolean'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean'),
  handleValidationErrors,
];

export const updateRetailValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 }),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('description')
    .optional()
    .trim()
    .notEmpty(),
  body('availability')
    .optional()
    .isBoolean(),
  body('published')
    .optional()
    .isBoolean(),
  handleValidationErrors,
];
