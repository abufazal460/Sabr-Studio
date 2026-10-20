import { isGoogleConfigured } from '../services/google.service.js';

/**
 * Public runtime configuration.
 *
 * The browser needs the Google Sign-In client id to render the official
 * Google Identity Services button, but the frontend must NOT carry the id in
 * a VITE_* env var (see ENV_AUDIT.md §5). Instead the backend publishes the
 * single, non-secret client id here so the build artefact stays free of
 * environment-specific credentials and can be re-pointed server-side.
 *
 * Only PUBLIC, non-secret values are exposed here. Never add JWT secrets,
 * OAuth client secrets, database URIs or webhook secrets to this payload.
 */
class ConfigController {
  getPublicConfig(req, res) {
    const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      data: {
        googleClientId,
        googleEnabled: Boolean(googleClientId) && isGoogleConfigured(),
      },
    });
  }
}

export const configController = new ConfigController();