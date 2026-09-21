import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware
 * References: SECURITY.md §7 (RATE-02, RATE-03), prompts/05-auth.md §9, §12
 */

// Strict rate limit for POST /api/auth/login (RATE-02)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.status(options.statusCode || 429).json(options.message);
  },
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

// Admin-scoped rate limiter for /api/admin/* (RATE-03)
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
  statusCode: 429,
  handler: (req, res, next, options) => {
    res.status(options.statusCode || 429).json(options.message);
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
