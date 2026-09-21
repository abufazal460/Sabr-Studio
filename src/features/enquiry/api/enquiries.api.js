import axiosClient from '../../../shared/api/axiosClient';

export const createEnquiry = async (payload) => {
  return axiosClient.post('/enquiries', payload);
};
