import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware
 * References: SECURITY.md §7 (RATE-02, RATE-03), prompts/05-auth.md §9, §12
 */

const isDev = process.env.NODE_ENV !== 'production';

// Strict rate limit for POST /api/auth/login (RATE-02)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 5, // Relaxed in dev, strictly 5 in production
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
  max: isDev ? 1000 : 50,
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

// General API rate limiter (100 requests per 15 minutes per IP)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
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

// Enquiry/contact form rate limiter (5 requests per 15 minutes per IP)
export const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5,
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
    message: 'Too many enquiries. Please try again later.',
  },
});

// NOTE: all limiters below use express-rate-limit's default in-memory store.
// On a multi-instance serverless deployment (e.g. Vercel) each instance keeps
// its own counters, so effective limits scale with instance count. For strict
// production guarantees, back these with a shared store (rate-limit-redis /
// rate-limit-memcached-store). See deployment docs.

function makeLimiter({ windowMs, prodMax, devMax, message }) {
  return rateLimit({
    windowMs,
    max: isDev ? devMax : prodMax,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
    statusCode: 429,
    handler: (req, res, next, options) => {
      res.status(options.statusCode || 429).json(options.message);
    },
    message: { success: false, message },
  });
}

// Customer account creation (RATE: strict per-IP)
export const customerRegisterLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, prodMax: 5, devMax: 100,
  message: 'Too many accounts created from this network. Please try again later.',
});

// Password reset request + confirmation (very strict; brute-force/enumeration guard)
export const resetLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, prodMax: 5, devMax: 100,
  message: 'Too many password-reset attempts. Please try again later.',
});

// Checkout session creation + payment verification (moderate; normal shopping unaffected)
export const checkoutLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, prodMax: 30, devMax: 500,
  message: 'Too many checkout attempts. Please try again shortly.',
});

// Phone OTP request + verify (strict; brute-force / SMS-pumping guard)
export const otpLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, prodMax: 8, devMax: 200,
  message: 'Too many login-code attempts. Please try again later.',
});
