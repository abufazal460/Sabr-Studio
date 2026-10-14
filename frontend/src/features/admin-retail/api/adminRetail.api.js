import axiosClient from '../../../shared/api/axiosClient';

export const adminApi = {
  // Stats
  getDashboardStats: () => axiosClient.get('/admin/stats'),

  // Projects
  getProjects: (params) => axiosClient.get('/admin/projects', { params }),
  createProject: (data) => axiosClient.post('/admin/projects', data),
  updateProject: (id, data) => axiosClient.put(`/admin/projects/${id}`, data),
  deleteProject: (id) => axiosClient.delete(`/admin/projects/${id}`),

  // Retail Items
  getRetailItems: (params) => axiosClient.get('/admin/retail', { params }),
  createRetailItem: (data) => axiosClient.post('/admin/retail', data),
  updateRetailItem: (id, data) => axiosClient.put(`/admin/retail/${id}`, data),
  deleteRetailItem: (id) => axiosClient.delete(`/admin/retail/${id}`),

  /**
   * Upload one product image as multipart/form-data (Work 04).
   * Lands in the fixed `sabrstudio/retail` Cloudinary folder.
   * @param {File} file
   * @param {object} [options]
   * @param {function} [options.onUploadProgress] (percent:number)=>void
   */
  uploadImage: (file, options = {}) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'retail');
    return axiosClient.post('/admin/uploads', form, {
      // Let the browser set the multipart boundary (axios strips the JSON default).
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress: (event) => {
        if (!options.onUploadProgress || !event.total) return;
        options.onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },

  // Retail Categories
  getCategories: () => axiosClient.get('/admin/retail/categories'),
  createCategory: (name) => axiosClient.post('/admin/retail/categories', { name }),
  deleteCategory: (name, cascade = false) =>
    axiosClient.delete(
      `/admin/retail/categories/${encodeURIComponent(name)}${cascade ? '?cascade=true' : ''}`
    ),

  // Enquiries
  getEnquiries: (params) => axiosClient.get('/admin/enquiries', { params }),
  updateEnquiryStatus: (id, status) => axiosClient.patch(`/admin/enquiries/${id}/status`, { status }),

  // Orders
  getOrders: (params) => axiosClient.get('/admin/orders', { params }),
  updateOrderStatus: (id, status) => axiosClient.patch(`/admin/orders/${id}/status`, { status }),
};

export default adminApi;
