import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <CartProvider>
        <AuthProvider>
          <CustomerProvider>
            <Navbar />
          </CustomerProvider>
        </AuthProvider>
      </CartProvider>
    </MemoryRouter>,
  );

describe('Navbar customer session state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Admin is not signed in: resolve the admin check with a plain 401 body
    // (mirrors the axios interceptor's normalized error, caught by AuthContext).
    axiosClient.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.reject({ success: false, status: 401 });
      return new Promise(() => {}); // /customer/me stays pending until resolved per-test
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
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // The mobile drawer must not advertise "Continue with Google" either while pending.
    await user.click(screen.getByLabelText('Toggle navigation menu'));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
    });
  });

  it('shows the account menu after the session is restored', async () => {
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

    resolveSession({ success: true, data: { customer: CUSTOMER } });

    await waitFor(() => {
      // Once restored, the account icon opens the signed-in menu (Profile / Logout).
      expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
    });

    const icon = screen.getByLabelText('Your account');
    await user.click(icon);

    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent(CUSTOMER.name);
    expect(menu).toHaveTextContent(CUSTOMER.email);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
