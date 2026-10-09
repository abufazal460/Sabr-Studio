import React, { useState } from 'react';
import TextInput from '../../../shared/components/TextInput';
import { Button } from '../../../shared/components/Button';
import useCustomer from '../../../shared/hooks/useCustomer';
import { forgotPassword, resetPassword } from '../../customer/api/customer.api';
import { LuX, LuUser } from 'react-icons/lu';

export const AuthModal = ({ open, onClose, onSuccess }) => {
  const { login, register } = useCustomer();
  const [mode, setMode] = useState('login'); // login | register | forgot | reset
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', token: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const switchMode = (m) => { setMode(m); setError(''); setInfo(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (mode === 'forgot') {
      if (!form.email) { setError('Email is required.'); return; }
      setBusy(true);
      try {
        await forgotPassword(form.email.trim());
        setInfo('If an account exists for that email, a reset code has been sent. Check your inbox.');
        setMode('reset');
      } catch (err) { setError(err?.message || 'Could not send reset code.'); }
      finally { setBusy(false); }
      return;
    }
    if (mode === 'reset') {
      if (!form.email || !form.token || !form.password) { setError('Email, reset code and new password are required.'); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      setBusy(true);
      try {
        await resetPassword({ email: form.email.trim(), token: form.token.trim(), password: form.password });
        setInfo('Password reset successful. Please log in with your new password.');
        setForm((f) => ({ ...f, token: '', password: '' }));
        setMode('login');
      } catch (err) { setError(err?.message || 'Password reset failed.'); }
      finally { setBusy(false); }
      return;
    }
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

  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Enter reset code';

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 py-8">
        <div className="relative bg-white border border-border rounded-md w-full max-w-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-ink"><LuUser className="w-5 h-5" /></span>
              <div>
                <h3 className="font-abhaya text-2xl text-ink font-medium">{title}</h3>
                <p className="text-xs text-muted">
                  {mode === 'login' || mode === 'register' ? 'Your bag is saved — log in to continue checkout.'
                    : mode === 'forgot' ? 'We will email you a single-use reset code.'
                    : 'Enter the code from your email and choose a new password.'}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-muted hover:text-ink" aria-label="Close login"><LuX className="w-5 h-5" /></button>
          </div>
          {error && <div role="alert" className="p-3 bg-error/5 border border-error/20 text-error text-xs rounded-sm">{error}</div>}
          {info && <div role="status" className="p-3 bg-surface border border-border text-ink text-xs rounded-sm">{info}</div>}
          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <>
                <TextInput id="cu-name" label="Full Name" required value={form.name} onChange={set('name')} placeholder="Aarav Sharma" autoComplete="name" />
                <TextInput id="cu-phone" label="Phone (for delivery updates)" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" />
              </>
            )}
            <TextInput id="cu-email" label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
            {mode === 'reset' && (
              <TextInput id="cu-token" label="Reset Code" required value={form.token} onChange={set('token')} placeholder="Paste the code from your email" autoComplete="one-time-code" />
            )}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <TextInput id="cu-pass" label={mode === 'reset' ? 'New Password' : 'Password'} type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            )}
            <Button type="submit" variant="Primary" fullWidth loading={busy} label={
              mode === 'login' ? 'Log In & Continue'
              : mode === 'register' ? 'Create Account & Continue'
              : mode === 'forgot' ? 'Send Reset Code'
              : 'Reset Password'
            } />
          </form>
          <div className="text-xs text-muted space-y-2">
            {mode === 'login' && (
              <>
                <p className="text-center">
                  <button type="button" className="underline text-ink font-medium" onClick={() => switchMode('forgot')}>Forgot Password?</button>
                </p>
                <p className="text-center">
                  New to Sabr Studio?{' '}
                  <button type="button" className="underline text-ink font-medium" onClick={() => switchMode('register')}>Create an account</button>
                </p>
              </>
            )}
            {mode === 'register' && (
              <p className="text-center">
                Already have an account?{' '}
                <button type="button" className="underline text-ink font-medium" onClick={() => switchMode('login')}>Log in</button>
              </p>
            )}
            {(mode === 'forgot' || mode === 'reset') && (
              <p className="text-center">
                <button type="button" className="underline text-ink font-medium" onClick={() => switchMode('login')}>Back to login</button>
                {mode === 'reset' && (
                  <> · <button type="button" className="underline text-ink font-medium" onClick={() => switchMode('forgot')}>Resend code</button></>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
