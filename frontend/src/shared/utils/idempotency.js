/**
 * Idempotency utilities for frontend
 */

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(prefix = 'client') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create a submission lock to prevent duplicate form submissions
 */
export function createSubmissionLock() {
  let isSubmitting = false;
  let lockId = null;

  return {
    /**
     * Acquire lock for submission
     */
    acquire(actionId) {
      if (isSubmitting) {
        return false;
      }
      isSubmitting = true;
      lockId = actionId;
      return true;
    },

    /**
     * Release lock after submission
     */
    release() {
      isSubmitting = false;
      lockId = null;
    },

    /**
     * Check if currently submitting
     */
    getIsSubmitting() {
      return isSubmitting;
    },

    /**
     * Get current lock ID
     */
    getLockId() {
      return lockId;
    },
  };
}

/**
 * Debounce function to prevent rapid repeated calls
 */
export function debounce(func, wait = 500) {
  let timeout = null;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      func.apply(this, args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution rate
 */
export function throttle(func, limit = 1000) {
  let inThrottle = false;

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export default {
  generateIdempotencyKey,
  createSubmissionLock,
  debounce,
  throttle,
};
