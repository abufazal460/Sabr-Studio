import { useState, useCallback } from 'react';
import { Button } from '../../../shared/components/Button';
import GoogleSignInButton from '../../../shared/components/GoogleSignInButton';
import useCustomer from '../../../shared/hooks/useCustomer';
import usePublicConfig from '../../../shared/hooks/usePublicConfig';
import { LuX, LuUser } from 'react-icons/lu';

export const AuthModal = ({ open, onClose, onSuccess }) => {
  const { googleLogin } = useCustomer();
  const { googleClientId } = usePublicConfig();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onGoogleCredential = useCallback(async (response) => {
    const credential = response?.credential;
    if (!credential) return;
    setError('');
    setBusy(true);
    try {
      const res = await googleLogin(credential);
      if (res.success) onSuccess?.();
      else setError(res.message || 'Google sign-in failed.');
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
    } finally { setBusy(false); }
  }, [googleLogin, onSuccess]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 py-8">
        <div className="relative bg-white border border-border rounded-md w-full max-w-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-ink">
                <LuUser className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-abhaya text-2xl text-ink font-medium">Sign in to continue</h3>
                <p className="text-xs text-muted">Use your Google account to check out faster.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-muted hover:text-ink" aria-label="Close login"><LuX className="w-5 h-5" /></button>
          </div>

          {error && <div role="alert" className="p-3 bg-error/5 border border-error/20 text-error text-xs rounded-sm">{error}</div>}

          <div className="space-y-4">
            <GoogleSignInButton clientId={googleClientId} onCredential={onGoogleCredential} disabled={busy} />
            {busy && <p className="text-xs text-muted text-center">Signing you in...</p>}
          </div>

          <div className="text-xs text-muted space-y-2">
            <p className="text-center">
              New to Sabr Studio?{' '}
              <span className="text-ink">Your account is created automatically on first sign-in.</span>
            </p>
            <div className="pt-2 flex justify-end">
              <Button variant="Secondary-Outline" size="sm" label="Continue as guest" onClick={onClose} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
