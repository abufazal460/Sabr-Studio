import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCustomer from '../../../shared/hooks/useCustomer';
import TextInput from '../../../shared/components/TextInput';
import { Button } from '../../../shared/components/Button';
import Seo from '../../../shared/components/Seo';
import EmptyState from '../../../shared/components/EmptyState';
import { LuUser, LuCircleCheck, LuLock } from 'react-icons/lu';

export const Profile = () => {
  const navigate = useNavigate();
  const { customer, isAuthenticated, loading, logout, updateProfile, deleteAccount } = useCustomer();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (customer) setForm({ name: customer.name || '', phone: customer.phone || '' });
  }, [customer]);

  if (loading) return <div className="max-w-container mx-auto px-5 py-16 text-xs text-muted">Loading your profile...</div>;
  if (!isAuthenticated) {
    return (
      <div className="max-w-container mx-auto px-5 py-16">
        <EmptyState icon={LuUser} title="Log in to view your profile" description="Your account details, addresses and order history live behind a secure Google sign-in." actionLabel="Sign in with Google" onAction={() => navigate('/login')} />
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name.trim() || form.name.trim().length < 2) { setError('Please enter your full name.'); return; }
    setSaving(true);
    try {
      // Only the allowlisted fields are sent. Email is owned by Google and
      // the backend rejects anything outside the allowlist.
      const res = await updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      if (res.success) setSuccess('Profile updated.');
      else setError(res.message || 'Could not update profile.');
    } catch (err) { setError(err?.message || 'Could not update profile.'); }
    finally { setSaving(false); }
  };

  const onDeleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      const res = await deleteAccount();
      if (res.success) {
        // State was cleared by the context; leave the profile page immediately.
        navigate('/');
      } else {
        setDeleteError(res.message || 'Could not delete your account. Please try again.');
        setConfirmingDelete(false);
      }
    } catch (err) {
      setDeleteError(err?.message || 'Could not delete your account. Please try again.');
      setConfirmingDelete(false);
    } finally { setDeleting(false); }
  };

  return (
    <div className="w-full bg-white">
      <Seo title="My Profile - Sabr Studio" noIndex />
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
          <div className="space-y-1">
            <TextInput id="pf-email" label="Email" type="email" value={customer?.email || ''} readOnly inputClassName="bg-surface text-muted cursor-not-allowed" autoComplete="email" />
            <p className="text-[11px] text-muted flex items-start gap-2"><LuLock className="w-3.5 h-3.5 shrink-0 mt-0.5" />Your email is managed by Google and cannot be changed here.</p>
          </div>
          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="Primary" loading={saving} label="Save Changes" />
          </div>
        </form>

        <p className="text-xs text-muted">
          Delivery addresses are managed during <Link to="/checkout" className="underline text-ink">checkout</Link>.
        </p>

        {/* Danger zone — explicit, two-step confirmed account deletion */}
        <section className="border border-error/30 rounded-md p-6 space-y-3 max-w-xl">
          <h2 className="font-abhaya text-xl text-ink">Delete Account</h2>
          {deleteError && (
            <div role="alert" className="p-3 bg-error/5 border border-error/20 text-error text-xs rounded-sm">{deleteError}</div>
          )}
          {!confirmingDelete ? (
            <>
              <p className="text-xs text-muted">
                Permanently delete your Sabr Studio account and saved delivery address. Your order and
                payment history is retained as required by law. This cannot be undone — you will be signed out.
              </p>
              <Button
                variant="Secondary-Outline"
                size="sm"
                label="Delete Account"
                className="!text-error border border-red-500"
                onClick={() => { setDeleteError(''); setConfirmingDelete(true); }}
              />
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink font-medium">
                Are you sure? This permanently deletes your profile and saved address. Type-free confirmation below —
                this cannot be undone.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="Primary" size="sm" label="Yes, Delete My Account" loading={deleting} onClick={onDeleteAccount} />
                <Button variant="Secondary-Outline" size="sm" label="Cancel" onClick={() => { setConfirmingDelete(false); setDeleteError(''); }} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
export default Profile;
