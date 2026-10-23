/**
 * Safe startup environment validation — production entry only (backend/server.js).
 *
 * - Names missing keys; NEVER prints values.
 * - Placeholder-looking values (example/changeme/xxxx/test-/...) count as missing.
 * - Production FAILS FAST only on JWT_SECRET (admin/customer login would throw
 *   'JWT_SECRET is not configured' on first use anyway — this surfaces it at boot).
 * - Everything else warns: MONGODB_URI (app boots + /api 503s by design),
 *   CORS_ORIGIN, ADMIN_PASSWORD (first-run lockout risk), APP_URL (EmailJS Origin).
 * - Optional integrations warn per feature group only when PARTIALLY configured.
 * - Dev/test never fail: local work boots without Atlas or third-party keys.
 */
import { logger } from './logger.js';

const PLACEHOLDER_RE = /^(xxxx|example|your-|test-|placeholder|change-?me|undefined|null|<.*>)\s*$/i;

function isBlank(v) {
  return !String(v || '').trim();
}
function isPlaceholder(v) {
  const s = String(v || '').trim();
  if (!s) return true;
  return PLACEHOLDER_RE.test(s) || /^(1234|password|secret)$/i.test(s);
}
function isValidHttpUrl(v) {
  try {
    const u = new URL(String(v).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function groupStatus(keys) {
  const missing = keys.filter((k) => isPlaceholder(process.env[k]));
  return { configured: missing.length === 0, missing };
}

export function checkEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const warnings = [];
  const fatals = [];

  // --- Fatal in production only ---
  if (isProd && isPlaceholder(process.env.JWT_SECRET)) {
    fatals.push('JWT_SECRET is missing or placeholder-like (admin/customer login cannot work).');
  }

  // --- Recommended in production (warn) ---
  if (isProd) {
    if (isBlank(process.env.MONGODB_URI)) {
      warnings.push('MONGODB_URI is not set — app boots but /api/* returns 503 DB_UNAVAILABLE (in-memory fallback is dev-only).');
    }
    if (isBlank(process.env.CORS_ORIGIN)) {
      warnings.push('CORS_ORIGIN is not set — cross-origin browsers (e.g. Vercel preview) will be blocked; same-domain Hostinger SPA is unaffected.');
    }
    if (isBlank(process.env.ADMIN_PASSWORD)) {
      warnings.push('ADMIN_PASSWORD is not set — first-run production bootstrap cannot create the initial admin (lockout risk on an empty admins collection).');
    }
    if (isBlank(process.env.APP_URL) && isBlank(process.env.EMAILJS_ORIGIN)) {
      warnings.push('APP_URL/EMAILJS_ORIGIN are not set — server-side EmailJS calls fall back to the Vercel origin and may be rejected with 403.');
    }
    const expiry = String(process.env.JWT_EXPIRES_IN || '24h').trim();
    if (!/^\d+[smhd]$/.test(expiry)) {
      warnings.push(`JWT_EXPIRES_IN=${expiry} does not look like a jsonwebtoken duration (e.g. 24h, 7d, 30d).`);
    }
    const customerExpiry = String(process.env.CUSTOMER_JWT_EXPIRES_IN || '').trim();
    if (customerExpiry && !/^\d+[smhd]$/.test(customerExpiry)) {
      warnings.push(`CUSTOMER_JWT_EXPIRES_IN=${customerExpiry} does not look like a jsonwebtoken duration (e.g. 365d, 30d).`);
    }
    for (const key of ['APP_URL', 'EMAILJS_ORIGIN']) {
      const v = process.env[key];
      if (!isBlank(v) && !isValidHttpUrl(v)) {
        warnings.push(`${key} is not a valid http(s) URL.`);
      }
    }
    const origins = String(process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
    for (const o of origins) {
      if (!isValidHttpUrl(o)) warnings.push(`CORS_ORIGIN entry is not a valid http(s) URL: origin hidden (value not printed).`);
    }
  }

  // --- Optional integrations: warn only when partially configured ---
  const groups = {
    'Razorpay checkout (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)': ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
    'Razorpay webhook verify (RAZORPAY_WEBHOOK_SECRET; else key secret is reused)': ['RAZORPAY_WEBHOOK_SECRET'],
    'Cloudinary uploads (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)': ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    'EmailJS notifications (EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY)': ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY'],
    'Google Sign-In verify (GOOGLE_CLIENT_ID)': ['GOOGLE_CLIENT_ID'],
  };
  for (const [label, keys] of Object.entries(groups)) {
    const st = groupStatus(keys);
    if (!st.configured && st.missing.length !== keys.length && isProd) {
      warnings.push(`${label} is PARTIALLY configured (missing: ${st.missing.join(', ')}). The feature fails closed until complete.`);
    }
  }

  for (const w of warnings) logger.warn(`[env] WARN: ${w}`);
  if (fatals.length) {
    for (const f of fatals) logger.error(`[env] FATAL: ${f}`);
    throw new Error(`Missing required production environment: ${fatals.length} fatal issue(s). See [env] FATAL lines above (keys only, values never printed).`);
  }
  logger.info(`[env] Environment check passed (NODE_ENV=${process.env.NODE_ENV || 'development'}).`);
}
