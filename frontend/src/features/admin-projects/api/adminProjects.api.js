import axiosClient from '../../../shared/api/axiosClient';

export const adminApi = {
  // Stats
  getDashboardStats: () => axiosClient.get('/admin/stats'),

  // Projects
  getProjects: (params) => axiosClient.get('/admin/projects', { params }),
  getProjectById: (id) => axiosClient.get(`/admin/projects/${id}`),
  createProject: (data) => axiosClient.post('/admin/projects', data),
  updateProject: (id, data) => axiosClient.put(`/admin/projects/${id}`, data),
  deleteProject: (id) => axiosClient.delete(`/admin/projects/${id}`),

  /**
   * Upload one image as multipart/form-data (Work 04).
   * @param {File} file        browser File from an <input type="file">
   * @param {object} [options]
   * @param {'projects'|'retail'} [options.folder] fixed destination folder
   * @param {function} [options.onUploadProgress] (percent:number)=>void
   * @returns {Promise<{success:boolean, data:{images:[{url,publicId}]}}>}
   */
  uploadImage: (file, options = {}) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', options.folder || 'projects');
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

  // Retail Items
  getRetailItems: (params) => axiosClient.get('/admin/retail', { params }),
  createRetailItem: (data) => axiosClient.post('/admin/retail', data),
  updateRetailItem: (id, data) => axiosClient.put(`/admin/retail/${id}`, data),
  deleteRetailItem: (id) => axiosClient.delete(`/admin/retail/${id}`),

  // Enquiries
  getEnquiries: (params) => axiosClient.get('/admin/enquiries', { params }),
  updateEnquiryStatus: (id, status) => axiosClient.patch(`/admin/enquiries/${id}/status`, { status }),

  // Orders
  getOrders: (params) => axiosClient.get('/admin/orders', { params }),
  updateOrderStatus: (id, status) => axiosClient.patch(`/admin/orders/${id}/status`, { status }),
};

export default adminApi;
