import { useEffect, useState, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

/**
 * Fetches the backend-provided PUBLIC runtime configuration.
 *
 * The Google Sign-In client id is deliberately NOT read from a VITE_ env var
 * (ENV_AUDIT.md §5 forbids frontend credential env vars). The backend owns it
 * and serves it from /api/config/public, so the same built bundle works in
 * every environment and nothing has to be rebuilt to re-point Google.
 */
let cached = null;
let inflight = null;

export function usePublicConfig() {
  const [config, setConfig] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    try {
      const res = await axiosClient.get('/config/public');
      const data = res?.data || {};
      cached = {
        googleClientId: String(data.googleClientId || ''),
        googleEnabled: Boolean(data.googleEnabled) && Boolean(data.googleClientId),
      };
    } catch {
      cached = { googleClientId: '', googleEnabled: false };
    }
    setConfig(cached);
    setLoading(false);
    return cached;
  }, []);

  useEffect(() => {
    if (cached) { setLoading(false); return; }
    if (inflight) return;
    inflight = refresh().finally(() => { inflight = null; });
  }, [refresh]);

  return {
    googleClientId: config?.googleClientId || '',
    googleEnabled: Boolean(config?.googleEnabled),
    loading,
    refresh,
  };
}

export default usePublicConfig;