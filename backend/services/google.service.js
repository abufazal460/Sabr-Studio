import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Server-side Google Identity verification.
 * The browser only ever sends an opaque Google ID token (the GIS "credential").
 * We verify its RS256 signature against Google's published JWKS and enforce
 * audience == our client id and a Google issuer. We NEVER trust a raw
 * email/googleId submitted by the client.
 */
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

let jwksCache = { keys: [], fetchedAt: 0 };
const JWKS_TTL_MS = 60 * 60 * 1000;

export function isGoogleConfigured() {
  return Boolean(String(process.env.GOOGLE_CLIENT_ID || '').trim());
}

async function getGoogleKeys() {
  const now = Date.now();
  if (jwksCache.keys.length && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(JWKS_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`);
    const json = await res.json();
    jwksCache = { keys: Array.isArray(json.keys) ? json.keys : [], fetchedAt: now };
    return jwksCache.keys;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Verify a Google ID token and return its claims.
 * Throws an Error with statusCode 400 (invalid token) or 503 (not configured).
 */
export async function verifyGoogleIdToken(idToken) {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    const e = new Error('Google Sign-In is not configured on the server (GOOGLE_CLIENT_ID missing).');
    e.statusCode = 503;
    throw e;
  }
  if (!idToken || typeof idToken !== 'string') {
    const e = new Error('Google credential is required.');
    e.statusCode = 400;
    throw e;
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || !decoded.header?.kid) {
    const e = new Error('Invalid Google credential.');
    e.statusCode = 400;
    throw e;
  }

  const keys = await getGoogleKeys();
  const jwk = keys.find((k) => k.kid === decoded.header.kid);
  if (!jwk) {
    const e = new Error('Invalid Google credential (unknown signing key).');
    e.statusCode = 400;
    throw e;
  }

  let payload;
  try {
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: VALID_ISSUERS,
    });
  } catch {
    const e = new Error('Google credential verification failed.');
    e.statusCode = 400;
    throw e;
  }

  if (!payload?.sub || !payload?.email) {
    const e = new Error('Google account is missing required identity claims.');
    e.statusCode = 400;
    throw e;
  }
  if (payload.email_verified !== true) {
    const e = new Error('Google email is not verified.');
    e.statusCode = 400;
    throw e;
  }

  return {
    googleId: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: payload.name || payload.given_name || String(payload.email).split('@')[0],
    avatar: payload.picture || '',
  };
}
