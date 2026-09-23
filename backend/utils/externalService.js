/**
 * External service client utilities with timeout, retry, and error handling
 */

import { OperationalError, ExternalServiceError, TimeoutError } from './errors.js';
import { serviceCircuitBreakers, withCircuitBreaker } from './circuitBreaker.js';

/**
 * Execute a function with timeout
 */
export async function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs)
  );
  
  return Promise.race([promise, timeout]);
}

/**
 * Execute with exponential backoff retry
 */
export async function withRetry({
  fn,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000,
  retryOn = [500, 502, 503, 504, 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'],
  operationName = 'Operation',
} = {}) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on operational errors that won't change
      if (error instanceof OperationalError && error.statusCode < 500) {
        throw error;
      }
      
      // Check if this is a retryable error
      const isRetryable = retryOn.some(condition => {
        if (typeof condition === 'number') {
          return error.statusCode === condition;
        }
        if (typeof condition === 'string') {
          return error.code === condition || error.message?.includes(condition);
        }
        return false;
      });
      
      // Always retry on 5xx
      const isServerError = error.statusCode >= 500 && error.statusCode < 600;
      
      if (!isRetryable && !isServerError || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const delay = Math.min(exponentialDelay + jitter, maxDelay);
      
      console.log(
        `[Retry:${operationName}] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${Math.round(delay)}ms`
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Execute external service call with full protection: circuit breaker + retry + timeout
 */
export async function protectedServiceCall({
  serviceName,
  fn,
  timeout = 10000,
  maxRetries = 2,
  fallback = null,
  retryOn = null,
} = {}) {
  const breaker = serviceCircuitBreakers[serviceName] || serviceCircuitBreakers.razorpay;
  
  return withCircuitBreaker(breaker, async () => {
    return await withRetry({
      fn: async () => {
        return await withTimeout(fn(), timeout, `${serviceName} call`);
      },
      maxRetries,
      baseDelay: 500,
      maxDelay: 5000,
      retryOn: retryOn || [500, 502, 503, 504, 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'],
      operationName: serviceName,
    });
  }, fallback);
}

/**
 * Create a simulated delay (for testing or rate limiting)
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate that an API response has expected structure
 */
export function validateResponse(response, schema) {
  if (!response || typeof response !== 'object') {
    throw new ExternalServiceError(
      schema.serviceName || 'External Service',
      'Invalid response format: expected object',
      502
    );
  }
  
  if (schema.required) {
    for (const field of schema.required) {
      if (response[field] === undefined || response[field] === null) {
        throw new ExternalServiceError(
          schema.serviceName || 'External Service',
          `Missing required field: ${field}`,
          502
        );
      }
    }
  }
  
  return response;
}
