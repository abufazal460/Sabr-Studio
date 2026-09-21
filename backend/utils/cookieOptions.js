/**
 * Cookie configuration options for Sabr Studio Admin Authentication
 * References: Master Context §6.5, SECURITY.md §4, ARCHITECTURE.md §10.5
 */

export const COOKIE_NAME = 'token';

/**
 * Returns cookie options for setting the authentication JWT
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';

  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  };
}

/**
 * Returns cookie options for clearing the authentication JWT
 */
export function getClearCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = process.env.COOKIE_SECURE === 'true' || isProduction;
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';

  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
  };
}
