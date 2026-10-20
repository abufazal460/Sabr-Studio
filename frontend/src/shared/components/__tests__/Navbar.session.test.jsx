import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Navbar from '../Navbar';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import { CustomerProvider } from '../../context/CustomerContext';
import axiosClient from '../../api/axiosClient';

vi.mock('../../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// jsdom lacks ResizeObserver, which framer-motion may probe for layout work.
if (!('ResizeObserver' in window)) {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = MockResizeObserver;
  window.ResizeObserver = MockResizeObserver;
}

const CUSTOMER = { id: 'c-1', name: 'Ada Lovelace', email: 'ada@google.com', phone: '' };

// Reports the current route so tests can assert WHERE the account icon lands.
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="loc">{location.pathname}</div>;
};

const renderNavbar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <CartProvider>
        <AuthProvider>
          <CustomerProvider>
            <Navbar />
            <Routes>
              <Route path="*" element={<LocationProbe />} />
            </Routes>
          </CustomerProvider>
        </AuthProvider>
      </CartProvider>
    </MemoryRouter>,
  );

describe('Navbar customer session state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Admin is not signed in: reject the admin check (mirrors the axios
    // interceptor's normalized error, caught by AuthContext).
    axiosClient.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.reject({ success: false, status: 401 });
      return new Promise(() => {}); // stays pending until resolved per-test
    });
  });

  it('does not flash logged-out UI while the session check is pending', async () => {
    const user = userEvent.setup();
    renderNavbar();

    // Session restore still in flight: clicking the account icon must NOT open
    // the Google login modal (the user may already be signed in).
    const icon = screen.getByLabelText('Your account');
    await user.click(icon);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // The mobile drawer must not advertise "Continue with Google" either while pending.
    await user.click(screen.getByLabelText('Toggle navigation menu'));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
    });
  });

  it('opens the login modal when the account icon is clicked while logged out', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.reject({ success: false, status: 401 });
      if (url === '/customer/me') return Promise.reject({ success: false, status: 401 });
      return Promise.reject({ success: false, status: 404 });
    });

    const user = userEvent.setup();
    renderNavbar();

    // Wait for the session check to settle into "logged out".
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/'));

    const icon = screen.getByLabelText('Your account');
    await user.click(icon);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/Sign in/i);
    expect(screen.getByTestId('loc')).toHaveTextContent('/');
  });

  it('routes the account icon to the profile page after login/session restore', async () => {
    let resolveSession;
    axiosClient.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.reject({ success: false, status: 401 });
      if (url === '/customer/me') {
        return new Promise((resolve) => { resolveSession = resolve; });
      }
      return Promise.reject({ success: false, status: 404 });
    });

    const user = userEvent.setup();
    renderNavbar();

    // While pending: the click is ignored (no login flash, no navigation).
    await user.click(screen.getByLabelText('Your account'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('loc')).toHaveTextContent('/');

    // Restore completes. The drawer's "Profile" link appearing is the
    // observable signal that customerLoading has resolved and state is authed.
    resolveSession({ success: true, data: { customer: CUSTOMER } });
    await user.click(screen.getByLabelText('Toggle navigation menu'));
    await screen.findByRole('button', { name: 'Profile' });
    await user.click(screen.getByLabelText('Toggle navigation menu')); // close drawer

    // The SAME account icon now opens the profile/account page — not login.
    await user.click(screen.getByLabelText('Your account'));
    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveTextContent('/account');
    }, { timeout: 2000 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
