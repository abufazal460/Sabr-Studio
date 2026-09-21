import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to normalize error handling and data envelope across the application
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let normalizedError = {
      success: false,
      message: 'Something went wrong',
      status: error.response?.status || 500,
      errors: [],
    };

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      normalizedError.message = 'Request timed out.';
    } else if (!error.response) {
      normalizedError.message = 'Network error, please try again.';
    } else {
      const status = error.response.status;
      const data = error.response.data || {};

      normalizedError.status = status;
      normalizedError.message = data.message || normalizedError.message;
      normalizedError.errors = data.errors || [];

      if (status === 400) {
        normalizedError.message = data.message || 'Please check the entered information.';
      } else if (status === 401) {
        normalizedError.message = 'Session expired. Please log in again.';
        // Admin route 401 check
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      } else if (status === 403) {
        normalizedError.message = "You don't have permission to do this.";
      } else if (status === 404) {
        normalizedError.message = data.message || 'Resource not found.';
      } else if (status === 409) {
        normalizedError.message = data.message || 'Conflict: This item already exists.';
      } else if (status === 429) {
        normalizedError.message = 'Too many attempts, please try again shortly.';
      } else if (status >= 500) {
        normalizedError.message = 'Something went wrong. Please try again later.';
      }
    }

    return Promise.reject(normalizedError);
  }
);

export default axiosClient;
