import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCustomer from '../../../shared/hooks/useCustomer';
import TextInput from '../../../shared/components/TextInput';
import { Button } from '../../../shared/components/Button';
import Seo from '../../../shared/components/Seo';
import EmptyState from '../../../shared/components/EmptyState';
import { LuUser, LuShieldCheck, LuCircleCheck } from 'react-icons/lu';

export const Profile = () => {
  const navigate = useNavigate();
  const { customer, isAuthenticated, loading, logout, updateProfile } = useCustomer();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (customer) setForm({ name: customer.name || '', email: customer.email || '', phone: customer.phone || '' });
  }, [customer]);

  if (loading) return <div className="max-w-container mx-auto px-5 py-16 text-xs text-muted">Loading your profile…</div>;
  if (!isAuthenticated) {
    return (
      <div className="max-w-container mx-auto px-5 py-16">
        <EmptyState icon={LuUser} title="Log in to view your profile" description="Your account details, addresses and order history live behind a secure login." actionLabel="Go to Checkout Login" onAction={() => navigate('/checkout')} />
      </div>
    );
  }

  const emailChanged = form.email.trim().toLowerCase() !== String(customer?.email || '').toLowerCase();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name.trim() || form.name.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Please enter a valid email address.'); return; }
    if (emailChanged && !currentPassword) { setError('Changing your email requires your current password.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim() };
      if (emailChanged) { payload.email = form.email.trim(); payload.currentPassword = currentPassword; }
      const res = await updateProfile(payload);
      if (res.success) { setSuccess('Profile updated.'); setCurrentPassword(''); }
      else setError(res.message || 'Could not update profile.');
    } catch (err) { setError(err?.message || 'Could not update profile.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="w-full bg-white">
      <Seo title="My Profile · Sabr Studio" noIndex />
      <div className="max-w-container mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-8">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-surface border border-border flex items-center justify-center text-ink"><LuUser className="w-5 h-5" /></span>
            <div>
              <h1 className="font-abhaya text-3xl text-ink font-medium">My Profile</h1>
              <p className="text-xs text-muted">Manage your account details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button to="/orders" variant="Secondary-Outline" size="sm" label="My Orders" />
            <Button variant="Secondary-Outline" size="sm" label="Log Out" onClick={async () => { await logout(); navigate('/'); }} />
          </div>
        </div>

        {error && <div role="alert" className="p-4 bg-error/5 border border-error/20 text-error text-xs rounded-sm">{error}</div>}
        {success && <div role="status" className="p-4 bg-success/5 border border-success/20 text-success text-xs rounded-sm flex items-center gap-2"><LuCircleCheck className="w-4 h-4" />{success}</div>}

        <form onSubmit={onSubmit} className="border border-border rounded-md p-6 sm:p-8 space-y-5 max-w-xl">
          <TextInput id="pf-name" label="Full Name" required value={form.name} onChange={set('name')} placeholder="Aarav Sharma" autoComplete="name" />
          <TextInput id="pf-phone" label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" />
          <TextInput id="pf-email" label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
          {emailChanged && (
            <div className="p-4 bg-surface border border-border rounded-sm space-y-3">
              <p className="text-[11px] text-muted flex items-start gap-2"><LuShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />Changing your email is a sensitive action. Confirm your current password to continue.</p>
              <TextInput id="pf-pass" label="Current Password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
          )}
          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="Primary" loading={saving} label="Save Changes" />
          </div>
        </form>

        <p className="text-xs text-muted">
          Delivery addresses are managed during <Link to="/checkout" className="underline text-ink">checkout</Link>.
        </p>
      </div>
    </div>
  );
};
export default Profile;
