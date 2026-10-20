import { customerService } from '../services/customer.service.js';
import { googleIdentity } from '../services/google.service.js';
import { getCustomerCookieOptions, getClearCookieOptions } from '../utils/cookieOptions.js';

export const CUSTOMER_COOKIE = 'sabr_customer';

/**
 * Clears the customer session cookie with attributes that always MATCH the
 * ones used to set it (path/SameSite/Secure), so the browser reliably drops
 * the persistent one-year cookie on logout AND on account deletion.
 */
function clearCustomerCookie(res) {
  const opts = getClearCookieOptions();
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(CUSTOMER_COOKIE, opts);
  } else {
    // Fallback manual Set-Cookie header to expire the cookie immediately.
    res.setHeader(
      'Set-Cookie',
      `${CUSTOMER_COOKIE}=; Path=${opts.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly${opts.secure ? '; Secure' : ''}; SameSite=${opts.sameSite}`,
    );
  }
}

function setCustomerCookie(res, token) {
  const opts = getCustomerCookieOptions();
  if (typeof res.cookie === 'function') {
    res.cookie(CUSTOMER_COOKIE, token, opts);
  } else {
    // Fallback manual Set-Cookie header if running in raw Connect/Node http.
    // Must include Max-Age so the cookie is persistent (not session-only).
    const maxAgeSeconds = Math.floor(opts.maxAge / 1000);
    res.setHeader(
      'Set-Cookie',
      `${CUSTOMER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${opts.sameSite}${opts.secure ? '; Secure' : ''}; Max-Age=${maxAgeSeconds}`,
    );
  }
}

class CustomerController {
  /**
   * The ONLY customer sign-in path. The browser sends an opaque Google ID
   * token; identity is established from the server-side-verified claims
   * (aud/iss/exp + email_verified), never from client-submitted data.
   */
  async google(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const credential = req.body?.credential || req.body?.idToken || req.body?.token;
      const identity = await googleIdentity.verify(credential);
      const result = await customerService.googleLogin(identity);
      setCustomerCookie(res, result.token);
      return res.status(200).json({ success: true, message: 'Google login successful', data: { customer: result.customer } });
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Google login failed' });
    }
  }
  async me(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data: { customer: req.customer } });
  }
  async logout(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    clearCustomerCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out' });
  }
  /**
   * Permanently deletes the authenticated customer's own account.
   * Identity comes from the session JWT via protectCustomer — a customer can
   * only ever delete themselves. Orders/payments are retained (never cascaded).
   * The response clears the session cookie so the browser drops it too.
   */
  async deleteAccount(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await customerService.deleteAccount(req.customer.id);
      clearCustomerCookie(res);
      return res.status(200).json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Could not delete account.' });
    }
  }
  /**
   * Profile mutation is restricted to the allowlisted fields (name, phone).
   * The email is owned by Google and cannot be changed from here.
   */
  async updateProfile(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const result = await customerService.updateProfile(req.customer.id, req.body || {});
      return res.status(200).json({ success: true, message: 'Profile updated', data: { customer: result.customer } });
    } catch (err) {
      // Pass the machine-readable `code` through (e.g. FIELD_NOT_EDITABLE for
      // an email change attempt) so API clients can branch on it.
      return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Profile update failed', ...(err.code ? { code: err.code } : {}) });
    }
  }
}

export const customerController = new CustomerController();
