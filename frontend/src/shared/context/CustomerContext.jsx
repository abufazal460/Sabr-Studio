import React, { createContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

export const CustomerContext = createContext(null);

export const CustomerProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await axiosClient.get('/customer/me');
      const data = res?.data?.customer || null;
      if (res?.success && data) setCustomer(data);
      else setCustomer(null);
    } catch { setCustomer(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const res = await axiosClient.post('/customer/login', { email, password });
      const data = res?.data?.customer || null;
      if (res?.success && data) { setCustomer(data); return { success: true }; }
      return { success: false, message: res?.message || 'Login failed' };
    } catch (err) { return { success: false, message: err?.message || 'Invalid credentials' }; }
  };

  const register = async (payload) => {
    try {
      const res = await axiosClient.post('/customer/register', payload);
      const data = res?.data?.customer || null;
      if (res?.success && data) { setCustomer(data); return { success: true }; }
      return { success: false, message: res?.message || 'Registration failed' };
    } catch (err) { return { success: false, message: err?.message || 'Registration failed' }; }
  };

  const googleLogin = async (payload) => {
    try {
      const res = await axiosClient.post('/customer/google', payload);
      const data = res?.data?.customer || null;
      if (res?.success && data) { setCustomer(data); return { success: true }; }
      return { success: false, message: res?.message || 'Google login failed' };
    } catch (err) { return { success: false, message: err?.message || 'Google login failed' }; }
  };

  const logout = async () => {
    try { await axiosClient.post('/customer/logout'); } catch {}
    finally { setCustomer(null); }
  };

  const updateProfile = async (payload) => {
    try {
      const res = await axiosClient.put('/customer/profile', payload);
      const data = res?.data?.customer || null;
      if (res?.success && data) { setCustomer(data); return { success: true, customer: data }; }
      return { success: false, message: res?.message || 'Profile update failed' };
    } catch (err) { return { success: false, message: err?.message || 'Profile update failed' }; }
  };

  return (
    <CustomerContext.Provider value={{ customer, setCustomer, loading, isAuthenticated: Boolean(customer), login, register, googleLogin, logout, updateProfile, checkAuth }}>
      {children}
    </CustomerContext.Provider>
  );
};

export default CustomerProvider;
