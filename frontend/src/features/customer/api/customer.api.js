import axiosClient from '../../../shared/api/axiosClient';

export const getAddresses = () => axiosClient.get('/customer/addresses');
export const createAddress = (payload) => axiosClient.post('/customer/addresses', payload);
export const updateAddress = (id, payload) => axiosClient.put(`/customer/addresses/${encodeURIComponent(id)}`, payload);
export const deleteAddress = (id) => axiosClient.delete(`/customer/addresses/${encodeURIComponent(id)}`);
export const setDefaultAddress = (id) => axiosClient.patch(`/customer/addresses/${encodeURIComponent(id)}/default`);
export const updateProfile = (payload) => axiosClient.put('/customer/profile', payload);
