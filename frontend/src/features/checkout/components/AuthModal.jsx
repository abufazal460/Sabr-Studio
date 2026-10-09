import React, { useState } from 'react';
import TextInput from '../../../shared/components/TextInput';
import { Button } from '../../../shared/components/Button';
import useCustomer from '../../../shared/hooks/useCustomer';
import { LuX, LuUser } from 'react-icons/lu';

export const AuthModal = ({ open, onClose, onSuccess }) => {
  const { login, register } = useCustomer();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    if (mode === 'register' && (!form.name || form.name.trim().length < 2)) { setError('Please enter your full name.'); return; }
    setBusy(true);
    try {
      const res = mode === 'login'
        ? await login(form.email.trim(), form.password)
        : await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() });
      if (res.success) onSuccess?.();
      else setError(res.message || 'Authentication failed.');
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 py-8">
        <div className="relative bg-white border border-border rounded-md w-full max-w-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-ink"><LuUser className="w-5 h-5" /></span>
              <div>
                <h3 className="font-abhaya text-2xl text-ink font-medium">{mode === 'login' ? 'Welcome back' : 'Create account'}</h3>
                <p className="text-xs text-muted">Your bag is saved — log in to continue checkout.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-muted hover:text-ink" aria-label="Close login"><LuX className="w-5 h-5" /></button>
          </div>
          {error && <div role="alert" className="p-3 bg-error/5 border border-error/20 text-error text-xs rounded-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <>
                <TextInput id="cu-name" label="Full Name" required value={form.name} onChange={set('name')} placeholder="Aarav Sharma" autoComplete="name" />
                <TextInput id="cu-phone" label="Phone (for delivery updates)" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" />
              </>
            )}
            <TextInput id="cu-email" label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
            <TextInput id="cu-pass" label="Password" type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <Button type="submit" variant="Primary" fullWidth loading={busy} label={mode === 'login' ? 'Log In & Continue' : 'Create Account & Continue'} />
          </form>
          <p className="text-xs text-muted text-center">
            {mode === 'login' ? "New to Sabr Studio? " : 'Already have an account? '}
            <button type="button" className="underline text-ink font-medium" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
