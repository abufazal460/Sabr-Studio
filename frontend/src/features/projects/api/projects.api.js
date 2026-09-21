import axiosClient from '../../../shared/api/axiosClient';

export const getProjects = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return axiosClient.get(`/projects${query ? `?${query}` : ''}`);
};

export const getProjectBySlug = async (slug) => {
  return axiosClient.get(`/projects/${slug}`);
};
