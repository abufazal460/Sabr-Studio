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

export const createProjectValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Project title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Project description is required'),
  body('category')
    .optional()
    .trim()
    .isString(),
  body('year')
    .optional({ nullable: true })
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Year must be a 4-digit number between 1900 and 2100'),
  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean'),
  handleValidationErrors,
];

export const updateProjectValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 }),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('year')
    .optional({ nullable: true })
    .isInt({ min: 1900, max: 2100 }),
  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }),
  body('published')
    .optional()
    .isBoolean(),
  handleValidationErrors,
];
