import React, { createContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check current session on app load using httpOnly cookie (GET /api/auth/me)
  const checkAuth = useCallback(async () => {
    try {
      const res = await axiosClient.get('/auth/me');
      if (res.success && res.data?.user) {
        setAdmin(res.data.user);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      if (res.success && res.data?.user) {
        setAdmin(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err.message || 'Invalid credentials' };
    }
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        loading,
        isAuthenticated: Boolean(admin),
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
