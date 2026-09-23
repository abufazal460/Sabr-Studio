/**
 * Enhanced error classes for Sabr Studio
 * Provides structured errors with operational vs programming error distinction
 */

/**
 * OperationalError - expected failures from external systems, network, etc.
 * These are known failure modes that should be handled gracefully.
 */
export class OperationalError extends Error {
  constructor(message, statusCode = 500, cause = null) {
    super(message);
    this.name = 'OperationalError';
    this.statusCode = statusCode;
    this.cause = cause;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * NotFoundError - resource not found
 */
export class NotFoundError extends OperationalError {
  constructor(resource = 'Resource', identifier = null) {
    const message = identifier 
      ? `${resource} not found: ${identifier}` 
      : `${resource} not found`;
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * ConflictError - duplicate or conflicting operation
 */
export class ConflictError extends OperationalError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * ValidationError - invalid input/data
 */
export class ValidationError extends OperationalError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 400, errors);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * UnauthorizedError - authentication required/failed
 */
export class UnauthorizedError extends OperationalError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * ForbiddenError - authenticated but not authorized
 */
export class ForbiddenError extends OperationalError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * ExternalServiceError - failure from third-party service
 */
export class ExternalServiceError extends OperationalError {
  constructor(serviceName, message, statusCode = 502, originalError = null) {
    super(
      `${serviceName} error: ${message}`,
      statusCode,
      originalError
    );
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

/**
 * ServiceUnavailableError - external service completely down
 */
export class ServiceUnavailableError extends OperationalError {
  constructor(serviceName, message = 'Service temporarily unavailable') {
    super(`${serviceName}: ${message}`, 503);
    this.name = 'ServiceUnavailableError';
    this.serviceName = serviceName;
  }
}

/**
 * TimeoutError - operation timed out
 */
export class TimeoutError extends OperationalError {
  constructor(operation = 'Operation', timeoutMs = 0) {
    super(`${operation} timed out after ${timeoutMs}ms`, 504);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Create an error from unknown/throwable for safe error handling
 */
export function normalizeError(error, context = {}) {
  if (error instanceof OperationalError) {
    return error;
  }
  
  // Handle Mongoose errors
  if (error.name === 'MongooseError' || error.name === 'MongoServerError') {
    return new OperationalError(
      'Database operation failed',
      500,
      error
    );
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return new UnauthorizedError(
      error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    );
  }
  
  // Handle generic errors
  return new OperationalError(
    error.message || 'An unexpected error occurred',
    error.statusCode || 500,
    error
  );
}
