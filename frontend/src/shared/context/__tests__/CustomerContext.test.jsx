import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CustomerProvider } from '../CustomerContext';
import { useCustomer } from '../../hooks/useCustomer';
import axiosClient from '../../api/axiosClient';

// The axios client is mocked at module level; the real client (withCredentials,
// interceptors) is exercised against the live backend in e2e flows.
vi.mock('../../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const wrapper = ({ children }) => <CustomerProvider>{children}</CustomerProvider>;
const renderCustomerHook = () => renderHook(() => useCustomer(), { wrapper });

const CUSTOMER = { id: 'c-1', name: 'Ada Lovelace', email: 'ada@google.com', phone: '' };

describe('CustomerContext session lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores the customer session from the backend on initialization', async () => {
    // Simulates a fresh page load: GET /customer/me replies with the valid session.
    axiosClient.get.mockResolvedValueOnce({ success: true, data: { customer: CUSTOMER } });

    const { result } = renderCustomerHook();

    // A pending session check is NOT a logged-out state.
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.isAuthenticated).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.customer?.email).toBe(CUSTOMER.email);
    expect(axiosClient.get).toHaveBeenCalledWith('/customer/me');
  });

  it('treats a genuine 401 as logged out without retry loops', async () => {
    axiosClient.get.mockRejectedValueOnce({ success: false, status: 401, message: 'Session expired. Please log in again.' });

    const { result } = renderCustomerHook();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.customer).toBeNull();
    // Exactly one attempt — no infinite retry on an unauthorized response.
    expect(axiosClient.get).toHaveBeenCalledTimes(1);
  });

  it('googleLogin populates the customer state on success', async () => {
    axiosClient.post.mockResolvedValueOnce({ success: true, message: 'Google login successful', data: { customer: CUSTOMER } });
    axiosClient.get.mockResolvedValueOnce({ success: false, status: 401 });

    const { result } = renderCustomerHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res;
    await act(async () => { res = await result.current.googleLogin('opaque-google-credential'); });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/customer/google', { credential: 'opaque-google-credential' });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.customer?.email).toBe(CUSTOMER.email);
  });

  it('explicit logout clears the frontend state immediately', async () => {
    axiosClient.get.mockResolvedValueOnce({ success: true, data: { customer: CUSTOMER } });
    axiosClient.post.mockResolvedValueOnce({ success: true, message: 'Logged out' });

    const { result } = renderCustomerHook();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => { await result.current.logout(); });

    expect(axiosClient.post).toHaveBeenCalledWith('/customer/logout');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.customer).toBeNull();
  });

  it('deleteAccount clears the state only on confirmed success', async () => {
    axiosClient.get.mockResolvedValueOnce({ success: true, data: { customer: CUSTOMER } });
    axiosClient.delete.mockResolvedValueOnce({ success: true, message: 'Account deleted successfully' });

    const { result } = renderCustomerHook();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    let res;
    await act(async () => { res = await result.current.deleteAccount(); });

    expect(res.success).toBe(true);
    expect(axiosClient.delete).toHaveBeenCalledWith('/customer/account');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.customer).toBeNull();
  });

  it('keeps the customer signed in when account deletion fails', async () => {
    axiosClient.get.mockResolvedValueOnce({ success: true, data: { customer: CUSTOMER } });
    axiosClient.delete.mockRejectedValueOnce({ success: false, status: 500, message: 'Service unavailable.' });

    const { result } = renderCustomerHook();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    let res;
    await act(async () => { res = await result.current.deleteAccount(); });

    expect(res.success).toBe(false);
    expect(res.message).toBe('Service unavailable.');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.customer).not.toBeNull();
  });
});
