import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Profile from '../Profile';
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

const CUSTOMER = { id: 'c-1', name: 'Ada Lovelace', email: 'ada@google.com', phone: '+91 98765 43210' };

const renderProfile = () =>
  render(
    <MemoryRouter initialEntries={['/account']}>
      <CustomerProvider>
        <Routes>
          <Route path="/account" element={<Profile />} />
          <Route path="/" element={<div data-testid="home" />} />
        </Routes>
      </CustomerProvider>
    </MemoryRouter>,
  );

describe('Customer profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosClient.get.mockResolvedValue({ success: true, data: { customer: CUSTOMER } });
  });

  it('shows current profile data with a read-only email', async () => {
    renderProfile();

    await screen.findByText('My Profile');
    const emailInput = screen.getByLabelText(/^Email/);
    expect(emailInput).toHaveValue(CUSTOMER.email);
    expect(emailInput).toHaveAttribute('readonly');
    // Required fields render a visual '*' (aria-hidden) — match by prefix.
    expect(screen.getByLabelText(/^Full Name/)).toHaveValue(CUSTOMER.name);
    expect(screen.getByLabelText(/^Phone/)).toHaveValue(CUSTOMER.phone);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('requires explicit two-step confirmation before deleting the account', async () => {
    const user = userEvent.setup();
    renderProfile();
    await screen.findByText('My Profile');

    // Step 1: the confirm button must NOT exist before asking for deletion.
    expect(screen.queryByRole('button', { name: 'Yes, Delete My Account' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));

    // Step 2: confirmation panel appears; nothing has been sent yet.
    expect(screen.getByRole('button', { name: 'Yes, Delete My Account' })).toBeInTheDocument();
    expect(axiosClient.delete).not.toHaveBeenCalled();

    // Cancel aborts without calling the API.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Yes, Delete My Account' })).not.toBeInTheDocument();
    expect(axiosClient.delete).not.toHaveBeenCalled();
  });

  it('deletes the account on confirmed submission and leaves the page', async () => {
    axiosClient.delete.mockResolvedValue({ success: true, message: 'Account deleted successfully' });
    const user = userEvent.setup();
    renderProfile();
    await screen.findByText('My Profile');

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete My Account' }));

    await screen.findByTestId('home');
    expect(axiosClient.delete).toHaveBeenCalledWith('/customer/account');
  });

  it('stays signed in and shows the error when deletion fails', async () => {
    axiosClient.delete.mockRejectedValue({ success: false, status: 500, message: 'Service unavailable.' });
    const user = userEvent.setup();
    renderProfile();
    await screen.findByText('My Profile');

    await user.click(screen.getByRole('button', { name: 'Delete Account' }));
    await user.click(screen.getByRole('button', { name: 'Yes, Delete My Account' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Service unavailable.');
    // Still on the profile page, still signed in.
    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveValue(CUSTOMER.email);
  });

  it('saves name/phone edits through the existing profile API (email untouched)', async () => {
    axiosClient.put.mockResolvedValue({
      success: true,
      message: 'Profile updated',
      data: { customer: { ...CUSTOMER, name: 'New Name', phone: '+911111111111' } },
    });
    const user = userEvent.setup();
    renderProfile();
    await screen.findByText('My Profile');

    const nameInput = screen.getByLabelText(/^Full Name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(axiosClient.put).toHaveBeenCalledWith('/customer/profile', { name: 'New Name', phone: CUSTOMER.phone }));
    // The email field was never part of the payload.
    const payload = axiosClient.put.mock.calls[0][1];
    expect(payload).not.toHaveProperty('email');
  });
});
