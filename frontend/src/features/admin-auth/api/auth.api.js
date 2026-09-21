import axiosClient from '../../../shared/api/axiosClient';

export const loginAdmin = async (credentials) => {
  return axiosClient.post('/auth/login', credentials);
};

export const getCurrentAdmin = async () => {
  return axiosClient.get('/auth/me');
};

export const logoutAdmin = async () => {
  return axiosClient.post('/auth/logout');
};
