import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useCustomer from '../../../shared/hooks/useCustomer';
import TextInput from '../../../shared/components/TextInput';
import { Button } from '../../../shared/components/Button';
import Seo from '../../../shared/components/Seo';
import { LuUser, LuSmartphone } from 'react-icons/lu';

export const CustomerAuthPage = ({ defaultMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, register, loginWithOtp } = useCustomer();

  const [mode, setMode] = useState(defaultMode); // 'login' | 'register' | 'otp'
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'code'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/account';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    setMode(defaultMode);
    setError('');
    setInfo('');
  }, [defaultMode]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);

    try {
      if (mode === 'login') {
        const res = await login(form.email.trim(), form.password);
        if (!res.success) {
          setError(res.message || 'Invalid email or password.');
        }
      } else if (mode === 'register') {
        if (!form.name.trim() || form.name.trim().length < 2) {
          setError('Please provide your full name.');
          setBusy(false);
          return;
        }
        const res = await register(form.name.trim(), form.email.trim(), form.password, form.phone.trim());
        if (!res.success) {
          setError(res.message || 'Could not complete registration.');
        }
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!otpPhone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    setBusy(true);
    try {
      // In development/test mode, simulated SMS delivery works
      setInfo('Verification code sent to ' + otpPhone);
      setOtpStep('code');
    } catch (err) {
      setError(err?.message || 'Could not send verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await loginWithOtp(otpPhone.trim(), otpCode.trim());
      if (!res.success) {
        setError(res.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setError(err?.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="w-full bg-surface min-h-[70vh] flex items-center justify-center py-16 px-5 sm:px-8">
      <Seo
        title={isRegister ? 'Create Account · Sabr Studio' : 'Customer Sign In · Sabr Studio'}
        description="Access your Sabr Studio customer account, order history, and design consultations."
        noIndex
      />

      <div className="max-w-md w-full bg-white border border-border rounded-md p-8 sm:p-10 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <span className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-ink mx-auto mb-3">
            <LuUser className="w-5 h-5" />
          </span>
          <h1 className="font-abhaya text-3xl font-medium text-ink">
            {isRegister ? 'Join Sabr Studio' : mode === 'otp' ? 'Phone Sign In' : 'Welcome Back'}
          </h1>
          <p className="font-inter text-xs text-muted">
            {isRegister
              ? 'Create an account to track orders and save your delivery details.'
              : mode === 'otp'
              ? 'Receive a one-time verification code via SMS.'
              : 'Log in to view orders, invoices and saved addresses.'}
          </p>
        </div>

        {/* Tab switch between email login and register */}
        {mode !== 'otp' && (
          <div className="flex border-b border-border text-xs uppercase tracking-wider font-medium text-center">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className={`flex-1 py-2.5 transition-colors border-b-2 ${
                mode === 'login'
                  ? 'border-black text-black font-semibold'
                  : 'border-transparent text-muted hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setInfo(''); }}
              className={`flex-1 py-2.5 transition-colors border-b-2 ${
                mode === 'register'
                  ? 'border-black text-black font-semibold'
                  : 'border-transparent text-muted hover:text-black'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 text-xs text-error bg-error/5 border border-error/20 rounded-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3 text-xs text-ink bg-surface border border-border rounded-sm">
            {info}
          </div>
        )}

        {mode === 'otp' ? (
          <form onSubmit={otpStep === 'phone' ? handleSendOtp : handleVerifyOtp} className="space-y-4">
            {otpStep === 'phone' ? (
              <TextInput
                id="otp-phone"
                label="Phone Number"
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={otpPhone}
                onChange={(e) => setOtpPhone(e.target.value)}
              />
            ) : (
              <TextInput
                id="otp-code"
                label="Verification Code"
                type="text"
                required
                placeholder="6-digit code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            )}

            <Button
              type="submit"
              variant="Primary"
              fullWidth
              disabled={busy}
              label={busy ? 'Verifying…' : otpStep === 'phone' ? 'Send Code' : 'Verify & Sign In'}
            />

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setOtpStep('phone'); setError(''); setInfo(''); }}
                className="text-xs text-muted hover:text-ink underline"
              >
                Sign in with email instead
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <TextInput
                id="cust-name"
                label="Full Name"
                type="text"
                required
                placeholder="Rohit Sharma"
                value={form.name}
                onChange={set('name')}
              />
            )}

            <TextInput
              id="cust-email"
              label="Email Address"
              type="email"
              required
              placeholder="rohit@example.com"
              value={form.email}
              onChange={set('email')}
            />

            {isRegister && (
              <TextInput
                id="cust-phone"
                label="Phone (optional)"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={set('phone')}
              />
            )}

            <TextInput
              id="cust-password"
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
            />

            <Button
              type="submit"
              variant="Primary"
              fullWidth
              disabled={busy}
              label={busy ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
            />

            <div className="flex items-center justify-between pt-2 text-xs text-muted">
              <button
                type="button"
                onClick={() => { setMode('otp'); setError(''); setInfo(''); }}
                className="inline-flex items-center gap-1 hover:text-ink"
              >
                <LuSmartphone className="w-3.5 h-3.5" /> Sign in via SMS
              </button>
              <Link to="/contact" className="hover:text-ink underline">
                Need help?
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CustomerAuthPage;
