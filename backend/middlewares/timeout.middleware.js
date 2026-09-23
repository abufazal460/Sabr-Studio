/**
 * Request timeout middleware for Express
 * Prevents slow requests from holding connections indefinitely
 */

/**
 * Create a timeout middleware that sets a deadline for request completion
 * 
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000 = 30s)
 * @param {string} timeoutMessage - Message to return on timeout
 */
export function createRequestTimeout(timeoutMs = 30000, timeoutMessage = 'Request timeout') {
  return (req, res, next) => {
    // Set timeout on the socket
    const timeout = setTimeout(() => {
      // Only respond if headers haven't been sent
      if (!res.headersSent) {
        logger?.error?.('[Timeout] Request timed out', {
          method: req.method,
          url: req.url,
          timeoutMs,
        });
        
        res.status(504).json({
          success: false,
          message: timeoutMessage,
        });
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    // Extend timeout for long-running operations (optional)
    // req.extendTimeout = (ms) => {
    //   clearTimeout(timeout);
    //   timeout = setTimeout(() => { ... }, ms);
    // };

    next();
  };
}

/**
 * Handle request timeout with proper cleanup
 */
export function setupRequestTimeout(app, timeoutMs = 30000) {
  // Apply timeout to all routes
  app.use(createRequestTimeout(timeoutMs));
  
  // Handle socket errors
  app.use((err, req, res, next) => {
    if (err.code === 'ECONNRESET' || err.code === 'socket hang up') {
      // Client disconnected - this is fine, just log it
      console.log(`[Timeout] Client disconnected: ${req.method} ${req.url}`);
      return;
    }
    next(err);
  });
}

/**
 * Simple logger fallback if logger utility not available
 */
const logger = {
  info: (msg, meta) => console.log(`[RequestTimeout] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[RequestTimeout] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[RequestTimeout] ${msg}`, meta || ''),
};

export default createRequestTimeout;
