import { validationResult } from 'express-validator';
import { sendError } from '../utils/sendResponse.js';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return sendError(res, 400, 'Validation failed for request payload', formattedErrors);
  }
  next();
};
