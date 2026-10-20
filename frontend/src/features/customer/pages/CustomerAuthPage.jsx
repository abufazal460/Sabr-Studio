import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import useCustomer from '../../../shared/hooks/useCustomer';
import usePublicConfig from '../../../shared/hooks/usePublicConfig';
import GoogleSignInButton from '../../../shared/components/GoogleSignInButton';
import Seo from '../../../shared/components/Seo';
import { LuUser } from 'react-icons/lu';

/**
 * Customer sign-in page.
 *
 * Google Identity Services is the ONLY customer authentication method:
 * there are no passwords, no email+password forms and no SMS OTP flow.
 * The browser hands the backend an opaque Google ID token; the backend
 * verifies it against Google and issues the customer session cookie.
 */
export const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, googleLogin } = useCustomer();
  const { googleClientId } = usePublicConfig();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/account';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const onGoogleCredential = useCallback(async (response) => {
    const credential = response?.credential;
    if (!credential) return;
    setError('');
    setBusy(true);
    try {
      const res = await googleLogin(credential);
      if (!res.success) setError(res.message || 'Google sign-in failed.');
    } catch (err) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [googleLogin]);

  return (
    <div className="w-full bg-surface min-h-[70vh] flex items-center justify-center py-16 px-5 sm:px-8">
      <Seo
        title="Customer Sign In - Sabr Studio"
        description="Access your Sabr Studio customer account, order history, and design consultations."
        noIndex
      />

      <div className="max-w-md w-full bg-white border border-border rounded-md p-8 sm:p-10 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <span className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-ink mx-auto mb-3">
            <LuUser className="w-5 h-5" />
          </span>
          <h1 className="font-abhaya text-3xl font-medium text-ink">Sign in with Google</h1>
          <p className="font-inter text-xs text-muted">
            Use your Google account to view orders, invoices and saved addresses.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 text-xs text-error bg-error/5 border border-error/20 rounded-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <GoogleSignInButton clientId={googleClientId} onCredential={onGoogleCredential} disabled={busy} />
          {busy && <p className="text-xs text-muted text-center">Signing you in...</p>}
        </div>

        <p className="text-xs text-muted text-center">
          New to Sabr Studio? Your account is created automatically on first sign-in.
        </p>

        <div className="text-center pt-2 text-xs text-muted">
          <Link to="/contact" className="hover:text-ink underline">Need help?</Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerAuthPage;