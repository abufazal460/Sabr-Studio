import { body, validationResult } from 'express-validator';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Enquiry validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

export const createEnquiryValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 150 })
    .withMessage('Name cannot exceed 150 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 6, max: 25 })
    .withMessage('Phone number must be between 6 and 25 characters'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 3000 })
    .withMessage('Message cannot exceed 3000 characters'),
  handleValidationErrors,
];

export const updateEnquiryStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['new', 'in-progress', 'resolved'])
    .withMessage('Status must be one of: new, in-progress, resolved'),
  handleValidationErrors,
];
