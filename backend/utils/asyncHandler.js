import { normalizeError } from './errors.js';

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch(err => {
      // Normalize unknown errors before passing to error handler
      next(normalizeError(err));
    });
};
