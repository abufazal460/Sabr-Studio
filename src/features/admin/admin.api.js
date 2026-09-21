import axiosClient from '../../shared/api/axiosClient';

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

  // Enquiries
  getEnquiries: (params) => axiosClient.get('/admin/enquiries', { params }),
  updateEnquiryStatus: (id, status) => axiosClient.patch(`/admin/enquiries/${id}/status`, { status }),

  // Orders
  getOrders: (params) => axiosClient.get('/admin/orders', { params }),
  updateOrderStatus: (id, status) => axiosClient.patch(`/admin/orders/${id}/status`, { status }),
};

export default adminApi;
