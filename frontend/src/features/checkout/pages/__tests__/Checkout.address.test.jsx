import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Checkout from '../Checkout';
import { CartProvider, useCart } from '../../../../shared/context/CartContext';
import { CustomerProvider } from '../../../../shared/context/CustomerContext';
import axiosClient from '../../../../shared/api/axiosClient';

vi.mock('../../../../shared/api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const CUSTOMER = { id: 'c-1', name: 'Ada Lovelace', email: 'ada@google.com', phone: '' };
const SAVED_ADDRESS = {
  _id: 'addr-1', id: 'addr-1', fullName: 'Ada Lovelace', phone: '+91 98765 43210',
  house: 'B-42', street: 'Defence Colony', city: 'New Delhi', state: 'Delhi',
  pincode: '110024', country: 'India', isDefault: true,
};
const CART_ITEM = { id: 'prod-1', title: 'Komorebi Chair', price: 34000, quantity: 1, image: '' };

const mockSession = (authed) => {
  axiosClient.get.mockImplementation((url) => {
    if (url === '/customer/me') {
      return authed
        ? Promise.resolve({ success: true, data: { customer: CUSTOMER } })
        : Promise.reject({ success: false, status: 401 });
    }
    if (url === '/customer/addresses') return Promise.resolve({ success: true, data: [] });
    return Promise.reject({ success: false, status: 404 });
  });
};

const renderCheckout = () =>
  render(
    <MemoryRouter>
      <CartProvider>
        <CustomerProvider>
          {/* Cart state is seeded through the context API: this environment's
              native localStorage stub is unusable, and CartContext tolerates
              that (its storage reads/writes are guarded). */}
          <CartSeeder />
          <Checkout />
        </CustomerProvider>
      </CartProvider>
    </MemoryRouter>,
  );

const CartSeeder = () => {
  const { addToCart, cartItems } = useCart();
  useEffect(() => {
    if (!cartItems.length) addToCart(CART_ITEM);
  }, [cartItems, addToCart]);
  return null;
};

describe('Checkout single-address UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Add Address when the signed-in customer has no saved address', async () => {
    mockSession(true);
    renderCheckout();

    expect(await screen.findByRole('button', { name: 'Add Address' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Address' })).not.toBeInTheDocument();
  });

  it('shows only Edit Address once an address is saved', async () => {
    mockSession(true);
    axiosClient.get.mockImplementation((url) => {
      if (url === '/customer/me') return Promise.resolve({ success: true, data: { customer: CUSTOMER } });
      if (url === '/customer/addresses') return Promise.resolve({ success: true, data: [SAVED_ADDRESS] });
      return Promise.reject({ success: false, status: 404 });
    });
    renderCheckout();

    expect(await screen.findByRole('button', { name: 'Edit Address' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Address' })).not.toBeInTheDocument();
    // The saved address itself is displayed.
    expect(screen.getByText(/Defence Colony/)).toBeInTheDocument();
  });

  it('shows no address button while the session check is pending', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/customer/me') return new Promise(() => {}); // never resolves
      return Promise.reject({ success: false, status: 404 });
    });
    renderCheckout();

    expect(await screen.findByText('Checking your session…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Address' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Address' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log In' })).not.toBeInTheDocument();
  });

  it('shows no address button when logged out', async () => {
    mockSession(false);
    renderCheckout();

    await waitFor(() => expect(screen.getByText(/Log in first, then add your delivery address/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Add Address' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Address' })).not.toBeInTheDocument();
  });

  it('opens the existing address form from the Add Address button', async () => {
    mockSession(true);
    const user = userEvent.setup();
    renderCheckout();

    await user.click(await screen.findByRole('button', { name: 'Add Address' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Add Delivery Address');
    expect(screen.getByLabelText(/^Full Name/)).toBeInTheDocument();
  });
});
