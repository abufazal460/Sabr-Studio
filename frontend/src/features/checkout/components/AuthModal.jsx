import React, { useState, useEffect, useRef, useCallback } from 'react';
import TextInput from '../../../shared/components/TextInput';
import { Button } from '../../../shared/components/Button';
import useCustomer from '../../../shared/hooks/useCustomer';
import { forgotPassword, resetPassword, requestOtp } from '../../customer/api/customer.api';
import { LuX, LuUser, LuSmartphone, LuRefreshCw } from 'react-icons/lu';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisLoading = null;
function loadGoogleScript() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => { gisLoading = null; reject(new Error('Could not load Google Sign-In script.')); };
    document.body.appendChild(s);
  });
  return gisLoading;
}

export const AuthModal = ({ open, onClose, onSuccess }) => {
  const { login, register, loginWithOtp, googleLogin } = useCustomer();
  const [mode, setMode] = useState('login'); // login | register | forgot | reset | otp
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', token: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // OTP sub-state
  const [otpStep, setOtpStep] = useState('phone'); // phone | code
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Google button
  const googleRef = useRef(null);

  const resetTransient = () => { setError(''); setInfo(''); };

  const switchMode = useCallback((m) => {
    setMode(m); resetTransient();
    if (m !== 'otp') { setOtpStep('phone'); setOtpCode(''); }
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const onGoogleCredential = useCallback(async (response) => {
    const credential = response?.credential;
    if (!credential) return;
    setError(''); setBusy(true);
    try {
      const res = await googleLogin(credential);
      if (res.success) onSuccess?.();
      else setError(res.message || 'Google sign-in failed.');
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
    } finally { setBusy(false); }
  }, [googleLogin, onSuccess]);

  // Render the official Google button whenever the login/otp screen is shown.
  useEffect(() => {
    if (!open) return undefined;
    if (mode !== 'login' && mode !== 'otp') return undefined;
    if (!GOOGLE_CLIENT_ID || !googleRef.current) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        if (cancelled || !google?.accounts?.id || !googleRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        google.accounts.id.renderButton(googleRef.current, {
          theme: 'outline', size: 'large', width: 320, text: 'continue_with', shape: 'rectangular',
        });
      })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Google Sign-In unavailable.'); });
    return () => { cancelled = true; };
  }, [open, mode, onGoogleCredential]);

  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const sendOtp = async () => {
    setError(''); setInfo('');
    const phone = form.phone.trim();
    if (!phone || phone.replace(/\D/g, '').length < 10) { setError('Enter a valid phone number with country code.'); return; }
    setBusy(true);
    try {
      await requestOtp(phone);
      setOtpPhone(phone);
      setOtpStep('code');
      setResendIn(60);
      setInfo('We sent a 6-digit code to your phone. It expires in 5 minutes.');
    } catch (err) {
      // Backend fails closed (503) when the SMS provider is not configured — surface the real reason.
      setError(err?.message || 'Could not send the login code.');
    } finally { setBusy(false); }
  };

  const confirmOtp = async () => {
    setError('');
    if (!otpCode || otpCode.trim().length < 4) { setError('Enter the code sent to your phone.'); return; }
    setBusy(true);
    try {
      const res = await loginWithOtp(otpPhone, otpCode.trim());
      if (res.success) onSuccess?.();
      else setError(res.message || 'That code is not valid.');
    } finally { setBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    resetTransient();
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
    if (mode === 'otp') {
      if (otpStep === 'phone') await sendOtp();
      else await confirmOtp();
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

  const title = mode === 'login' ? 'Welcome back'
    : mode === 'register' ? 'Create account'
    : mode === 'forgot' ? 'Reset password'
    : mode === 'reset' ? 'Enter reset code'
    : (otpStep === 'phone' ? 'Phone login' : 'Enter code');

  const subtitle = mode === 'login' || mode === 'register' ? 'Your bag is saved — log in to continue checkout.'
    : mode === 'forgot' ? 'We will email you a single-use reset code.'
    : mode === 'reset' ? 'Enter the code from your email and choose a new password.'
    : otpStep === 'phone' ? 'We will text you a one-time code. No password needed.'
    : `Enter the 6-digit code sent to ${otpPhone}.`;

  const submitLabel = mode === 'login' ? 'Log In & Continue'
    : mode === 'register' ? 'Create Account & Continue'
    : mode === 'forgot' ? 'Send Reset Code'
    : mode === 'reset' ? 'Reset Password'
    : otpStep === 'phone' ? 'Send Login Code'
    : 'Verify Code & Continue';

  const googleBlock = (mode === 'login' || mode === 'otp') && (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[11px] text-muted">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      {GOOGLE_CLIENT_ID
        ? <div ref={googleRef} className="flex justify-center" />
        : (
          <div className="p-3 bg-surface border border-border text-muted text-xs rounded-sm text-center">
            Google Sign-In is not configured yet (missing <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code>).
          </div>
        )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 py-8">
        <div className="relative bg-white border border-border rounded-md w-full max-w-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-ink">
                {mode === 'otp' ? <LuSmartphone className="w-5 h-5" /> : <LuUser className="w-5 h-5" />}
              </span>
              <div>
                <h3 className="font-abhaya text-2xl text-ink font-medium">{title}</h3>
                <p className="text-xs text-muted">{subtitle}</p>
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

            {mode === 'otp' && otpStep === 'phone' && (
              <TextInput id="cu-otp-phone" label="Phone Number" type="tel" required value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" />
            )}
            {mode === 'otp' && otpStep === 'code' && (
              <TextInput id="cu-otp-code" label="Login Code" required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-digit code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
              <TextInput id="cu-email" label="Email" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
            )}
            {mode === 'reset' && (
              <TextInput id="cu-token" label="Reset Code" required value={form.token} onChange={set('token')} placeholder="Paste the code from your email" autoComplete="one-time-code" />
            )}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <TextInput id="cu-pass" label={mode === 'reset' ? 'New Password' : 'Password'} type="password" required value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            )}

            <Button type="submit" variant="Primary" fullWidth loading={busy} label={submitLabel} />

            {mode === 'otp' && otpStep === 'code' && (
              <button
                type="button"
                onClick={sendOtp}
                disabled={busy || resendIn > 0}
                className="w-full flex items-center justify-center gap-2 text-xs text-muted hover:text-ink disabled:opacity-50"
              >
                <LuRefreshCw className="w-3.5 h-3.5" />
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            )}
          </form>

          {googleBlock}

          <div className="text-xs text-muted space-y-2">
            {mode === 'login' && (
              <>
                <p className="text-center">
                  <button type="button" className="underline text-ink font-medium" onClick={() => switchMode('otp')}>Log in with phone OTP</button>
                  {' · '}
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
            {mode === 'otp' && (
              <p className="text-center">
                <button type="button" className="underline text-ink font-medium" onClick={() => switchMode('login')}>Back to email login</button>
                {otpStep === 'code' && (
                  <> · <button type="button" className="underline text-ink font-medium" onClick={() => { setOtpStep('phone'); setOtpCode(''); resetTransient(); }}>Change number</button></>
                )}
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
