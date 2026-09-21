import axiosClient from '../../../shared/api/axiosClient';

export const createCheckoutSession = async (payload) => {
  return axiosClient.post('/orders/checkout', payload);
};

export const verifyPayment = async (payload) => {
  return axiosClient.post('/orders/verify', payload);
};
