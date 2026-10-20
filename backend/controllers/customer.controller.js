import { customerService } from '../services/customer.service.js';
import { googleIdentity } from '../services/google.service.js';
import { getCustomerCookieOptions, getClearCookieOptions } from '../utils/cookieOptions.js';

export const CUSTOMER_COOKIE = 'sabr_customer';

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
    return res.status(200).json({ success: true, message: 'Logged out' });
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
      return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Profile update failed' });
    }
  }
}

export const customerController = new CustomerController();
