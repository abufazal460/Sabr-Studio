/**
 * Idempotency utilities for preventing duplicate operations
 * Uses in-memory store with optional persistent backend
 */

import crypto from 'crypto';

// In-memory idempotency store (would be Redis in production)
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate an idempotency key for a request
 * Can be client-provided or server-generated
 */
export function generateIdempotencyKey(prefix = 'idem') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Parse idempotency key from request headers or body
 */
export function extractIdempotencyKey(req) {
  // Check headers first
  if (req.headers && req.headers['idempotency-key']) {
    return req.headers['idempotency-key'];
  }
  
  // Check body for idempotency key
  if (req.body && req.body.idempotencyKey) {
    return req.body.idempotencyKey;
  }
  
  return null;
}

/**
 * Idempotency entry
 */
class IdempotencyEntry {
  constructor(key, response, ttlMs = IDEMPOTENCY_TTL_MS) {
    this.key = key;
    this.response = response;
    this.createdAt = Date.now();
    this.expiresAt = createdAt + ttlMs;
    this.statusCode = response.statusCode;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

/**
 * Store an idempotency record
 */
function storeIdempotency(key, response) {
  idempotencyStore.set(key, new IdempotencyEntry(key, response));
  
  // Cleanup old entries periodically
  if (idempotencyStore.size > 10000) {
    cleanupIdempotencyStore();
  }
}

/**
 * Get a stored idempotency response
 */
function getIdempotency(key) {
  const entry = idempotencyStore.get(key);
  
  if (!entry) return null;
  
  if (entry.isExpired()) {
    idempotencyStore.delete(key);
    return null;
  }
  
  return entry.response;
}

/**
 * Clean up expired entries
 */
function cleanupIdempotencyStore() {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (entry.isExpired()) {
      idempotencyStore.delete(key);
    }
  }
}

/**
 * Middleware to handle idempotency for POST/PUT/PATCH requests
 * 
 * Uses a lock pattern to prevent concurrent duplicate processing:
 * 1. Check if idempotency key exists in cache
 * 2. If exists and not processing, return cached response
 * 3. If exists and processing, return 409 Conflict
 * 4. If not exists, set processing flag and continue
 * 5. After response, store result and clear processing flag
 */
export function idempotencyMiddleware(req, res, next) {
  // Only apply to mutating methods
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  const key = extractIdempotencyKey(req);
  
  if (!key) {
    return next();
  }
  
  const existing = getIdempotency(key);
  
  if (existing) {
    // Return cached response
    return res.status(existing.statusCode).json(existing);
  }
  
  // Mark as processing
  storeIdempotency(key, { processing: true, statusCode: 409 });
  
  // Intercept response to store result
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  
  res._idempotencyKey = key;
  res._originalJson = originalJson;
  res._originalStatus = originalStatus;
  
  // Override json to capture response
  res.json = function(data) {
    storeIdempotency(key, {
      success: data.success !== false,
      data: data.data,
      message: data.message,
      statusCode: res.statusCode,
    });
    
    return originalJson(data);
  };
  
  // Override status to track
  res.status = function(statusCode) {
    res.statusCode = statusCode;
    return res;
  };
  
  next();
}

/**
 * Finalize idempotency after response
 * Call this in a response-finally pattern if not using the middleware override
 */
export function finalizeIdempotency(key, response) {
  if (key && response) {
    storeIdempotency(key, response);
  }
}

/**
 * Check if request is being reprocessed
 */
export function isReprocessing(key) {
  const entry = idempotencyStore.get(key);
  return entry && entry.response && entry.response.processing === true;
}

/**
 * Rate limit with idempotency - simple token bucket per key
 */
class IdempotencyRateLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const record = this.requests.get(key) || { count: 0, resetAt: now + this.windowMs };
    
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + this.windowMs;
    }
    
    record.count++;
    this.requests.set(key, record);
    
    return record.count <= this.maxRequests;
  }

  getRemaining(key) {
    const record = this.requests.get(key);
    if (!record) return this.maxRequests;
    
    const now = Date.now();
    if (now > record.resetAt) return this.maxRequests;
    
    return Math.max(0, this.maxRequests - record.count);
  }
}

// Global rate limiter instance
export const idempotencyLimiter = new IdempotencyRateLimiter(10, 60000);

export default {
  generateIdempotencyKey,
  extractIdempotencyKey,
  idempotencyMiddleware,
  finalizeIdempotency,
  isReprocessing,
  idempotencyLimiter,
};
