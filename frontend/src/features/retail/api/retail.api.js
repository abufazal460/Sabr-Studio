import axiosClient from '../../../shared/api/axiosClient';

export const getRetailProducts = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return axiosClient.get(`/retail${query ? `?${query}` : ''}`);
};

export const getRetailProductBySlug = async (slug) => {
  return axiosClient.get(`/retail/${slug}`);
};
