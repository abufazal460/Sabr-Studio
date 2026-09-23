import { logger } from '../utils/logger.js';
import { OperationalError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ExternalServiceError, ServiceUnavailableError, TimeoutError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  // Log the error with context
  const logContext = {
    method: req.method,
    url: req.url,
    statusCode: err.statusCode || 500,
    errorName: err.name,
    message: err.message,
    ip: req.ip,
    adminId: req.admin?.id || null,
  };
  
  logger.error(`${logContext.method} ${logContext.url} - ${logContext.statusCode} - ${logContext.errorName || 'Error'}`, logContext);

  // Handle known error types with appropriate responses
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ExternalServiceError) {
    // Log external service errors with more context
    logger.error(`External service error [${err.serviceName}]: ${err.message}`, {
      serviceName: err.serviceName,
      originalError: err.originalError?.message,
    });
    
    return res.status(err.statusCode).json({
      success: false,
      message: 'External service temporarily unavailable. Please try again.',
    });
  }

  if (err instanceof ServiceUnavailableError) {
    return res.status(503).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof TimeoutError) {
    return res.status(504).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof OperationalError) {
    // Other operational errors
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Handle Mongoose/MongoDB specific errors
  if (err.name === 'MongooseError' || err.name === 'MongoServerError') {
    logger.error('Database error:', { error: err.message, code: err.code });
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Resource already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Database operation failed',
    });
  }

  // Handle JSON Web Token errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired',
    });
  }

  // Production: hide internal details
  // Development: include stack trace
  const response = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(err.statusCode || 500).json(response);
};
