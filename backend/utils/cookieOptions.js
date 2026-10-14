/**
 * Cookie configuration options for Sabr Studio (https://sabrstudio.in/)
 * References: Master Context §6.5, SECURITY.md §4, ARCHITECTURE.md §10.5
 */

export const COOKIE_NAME = 'token';
export const CUSTOMER_COOKIE_NAME = 'sabr_customer';

/**
 * Returns cookie options for setting the authentication JWT (admin: 24 hours)
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = isProduction ? true : process.env.COOKIE_SECURE === 'true';
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
 * Returns cookie options for setting the customer authentication JWT (customer: 30 days)
 */
export function getCustomerCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = isProduction ? true : process.env.COOKIE_SECURE === 'true';
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';

  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  };
}

/**
 * Returns cookie options for clearing authentication JWT
 */
export function getClearCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure = isProduction ? true : process.env.COOKIE_SECURE === 'true';
  const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';

  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
  };
}
