import { useEffect, useRef, useState } from 'react';
import { LuCircleAlert } from 'react-icons/lu';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisLoading = null;
export function loadGoogleScript() {
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

/**
 * Renders the official Google Identity Services button.
 *
 * The client id comes from the backend (`/api/config/public`) — never from a
 * VITE_* env var. Only the opaque credential is handed back to the caller;
 * the backend performs the actual token verification.
 */
export const GoogleSignInButton = ({ clientId, onCredential, disabled = false, text = 'signin_with' }) => {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => { callbackRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        if (cancelled || !google?.accounts?.id || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current?.(response),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: Math.min(320, Math.max(240, buttonRef.current.offsetWidth || 320)),
          text,
          shape: 'rectangular',
        });
      })
      .catch(() => { if (!cancelled) setScriptFailed(true); });
    return () => { cancelled = true; };
  }, [clientId, text]);

  if (!clientId) {
    return (
      <div className="p-3 bg-surface border border-border text-muted text-xs rounded-sm text-center">
        Google Sign-In is not configured yet. Please contact support.
      </div>
    );
  }
  if (scriptFailed) {
    return (
      <div role="alert" className="p-3 bg-error/5 border border-error/20 text-error text-xs rounded-sm text-center flex items-center justify-center gap-2">
        <LuCircleAlert className="w-4 h-4 shrink-0" /> Could not load Google Sign-In. Please check your connection.
      </div>
    );
  }
  return <div ref={buttonRef} className={`flex justify-center ${disabled ? 'opacity-60 pointer-events-none' : ''}`} />;
};

export default GoogleSignInButton;