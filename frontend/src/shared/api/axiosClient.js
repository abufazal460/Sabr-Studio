import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 2,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableMethods: ['GET'], // Only retry safe methods by default
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry request with exponential backoff
 */
async function retryRequest(requestConfig, attempt = 0) {
  try {
    return await axios.request(requestConfig);
  } catch (error) {
    const status = error.response?.status;
    const method = requestConfig.method?.toUpperCase() || 'GET';
    
    // Check if we should retry
    const shouldRetry = 
      attempt < RETRY_CONFIG.maxRetries &&
      RETRY_CONFIG.retryableMethods.includes(method) &&
      (RETRY_CONFIG.retryableStatusCodes.includes(status) || !error.response);
    
    if (shouldRetry) {
      // Exponential backoff with jitter
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt) + Math.random() * 100;
      console.log(`[API] Retry attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${Math.round(delay)}ms`);
      await sleep(delay);
      return retryRequest(requestConfig, attempt + 1);
    }
    
    throw error;
  }
}

// Response interceptor to normalize error handling and data envelope across the application
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const config = error.config;
    const isGet = !config?.method || config.method.toUpperCase() === 'GET';

    // Auto-retry transient network errors and 502/503/504 up to 2 times
    if (config && isGet && (!config._retryCount || config._retryCount < 2)) {
      const isNetworkErr = !error.response || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK';
      const isGatewayErr = [502, 503, 504].includes(error.response?.status);
      if (isNetworkErr || isGatewayErr) {
        config._retryCount = (config._retryCount || 0) + 1;
        await sleep(600 * config._retryCount);
        return axiosClient(config);
      }
    }

    let normalizedError = {
      success: false,
      message: 'Something went wrong',
      status: error.response?.status ?? 0,
      errors: [],
      code: error.code || 'ERR_NETWORK',
    };

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      normalizedError.status = 408;
      normalizedError.code = error.code || 'ECONNABORTED';
      normalizedError.message = 'Request timed out. Please try again.';
    } else if (!error.response) {
      // No HTTP response at all: backend down, proxy down, DNS, or CORS-blocked.
      // Keep status 0 (distinct from HTTP 500) so pages can tell
      // "no response" apart from "server returned 500".
      normalizedError.status = 0;
      normalizedError.code = error.code || 'ERR_NETWORK';
      normalizedError.message = 'Unable to connect to backend server. Please ensure the backend is running at http://localhost:3000.';
      if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        console.error('[API] No response from backend:', {
          url: error.config?.baseURL ? `${error.config.baseURL}${error.config.url || ''}` : error.config?.url,
          method: error.config?.method,
          code: normalizedError.code,
          detail: error.message,
        });
      }
    } else {
      const status = error.response.status;
      const data = error.response.data || {};

      normalizedError.status = status;
      normalizedError.message = data.message || normalizedError.message;
      normalizedError.errors = data.errors || [];

      if (status === 400) {
        normalizedError.message = data.message || 'Please check the entered information.';
      } else if (status === 401) {
        normalizedError.message = data.message || 'Session expired. Please log in again.';
        // Admin route 401 check
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      } else if (status === 403) {
        normalizedError.message = data.message || "You don't have permission to do this.";
      } else if (status === 404) {
        normalizedError.message = data.message || 'Resource not found.';
      } else if (status === 409) {
        normalizedError.message = data.message || 'This operation was already processed.';
      } else if (status === 429) {
        normalizedError.message = data.message || 'Too many attempts. Please wait a moment and try again.';
      } else if (status === 502) {
        normalizedError.message = data.message || 'Backend server is starting up or unreachable on port 3000.';
      } else if (status >= 500) {
        normalizedError.message = data.message || 'Service temporarily unavailable. Please try again later.';
      }
    }

    return Promise.reject(normalizedError);
  }
);

/**
 * Create a new axios instance with retry enabled for specific operations
 */
export function createRetryableClient(options = {}) {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    withCredentials: true,
    timeout: options.timeout || 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add retry logic for this client
  client.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const status = error.response?.status;
      const method = error.config?.method?.toUpperCase() || 'GET';
      
      if (options.retryableMethods?.includes(method) && 
          (options.retryableStatusCodes || RETRY_CONFIG.retryableStatusCodes).includes(status)) {
        if (options.maxRetries !== 0) {
          const delay = (options.retryDelay || RETRY_CONFIG.retryDelay) * 2;
          await sleep(delay);
          return client(error.config);
        }
      }
      
      return Promise.reject(error);
    }
  );

  return client;
}

export default axiosClient;
