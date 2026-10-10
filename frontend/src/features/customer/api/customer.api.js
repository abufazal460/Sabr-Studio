import axiosClient from '../../../shared/api/axiosClient';

export const getAddresses = () => axiosClient.get('/customer/addresses');
export const createAddress = (payload) => axiosClient.post('/customer/addresses', payload);
export const updateAddress = (id, payload) => axiosClient.put(`/customer/addresses/${encodeURIComponent(id)}`, payload);
export const deleteAddress = (id) => axiosClient.delete(`/customer/addresses/${encodeURIComponent(id)}`);
export const setDefaultAddress = (id) => axiosClient.patch(`/customer/addresses/${encodeURIComponent(id)}/default`);
export const updateProfile = (payload) => axiosClient.put('/customer/profile', payload);
export const forgotPassword = (email) => axiosClient.post('/customer/forgot-password', { email });
export const resetPassword = (payload) => axiosClient.post('/customer/reset-password', payload);
export const requestOtp = (phone) => axiosClient.post('/customer/request-otp', { phone });
export const verifyOtp = (phone, code) => axiosClient.post('/customer/verify-otp', { phone, code });
export const googleAuth = (credential) => axiosClient.post('/customer/google', { credential });
export const getProfile = () => axiosClient.get('/customer/me');
