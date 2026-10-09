import { customerService } from '../services/customer.service.js';
import { COOKIE_NAME, getCookieOptions, getClearCookieOptions } from '../utils/cookieOptions.js';

export const CUSTOMER_COOKIE = 'sabr_customer';

function setCustomerCookie(res, token) {
  const opts = getCookieOptions();
  if (typeof res.cookie === 'function') res.cookie(CUSTOMER_COOKIE, token, opts);
  else res.setHeader('Set-Cookie', `${CUSTOMER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${opts.sameSite}`);
}

class CustomerController {
  async register(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const result = await customerService.register(req.body || {});
      setCustomerCookie(res, result.token);
      return res.status(201).json({ success: true, message: 'Account created', data: { customer: result.customer } });
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Registration failed' });
    }
  }
  async login(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const result = await customerService.login(req.body?.email, req.body?.password);
      if (!result) return res.status(401).json({ success: false, message: 'Invalid email or password' });
      setCustomerCookie(res, result.token);
      return res.status(200).json({ success: true, message: 'Login successful', data: { customer: result.customer } });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Login failed' });
    }
  }
  async google(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const result = await customerService.googleLogin(req.body || {});
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
    if (typeof res.clearCookie === 'function') res.clearCookie(CUSTOMER_COOKIE, opts);
    return res.status(200).json({ success: true, message: 'Logged out' });
  }
  async updateProfile(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { name, phone, email, currentPassword } = req.body || {};
      const result = await customerService.updateProfile(req.customer.id, { name, phone, email, currentPassword });
      return res.status(200).json({ success: true, message: 'Profile updated', data: { customer: result.customer } });
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Profile update failed' });
    }
  }
  async forgotPassword(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await customerService.requestPasswordReset(req.body?.email);
    } catch { /* never leak */ }
    // Enumeration-safe: identical response whether or not the account exists.
    return res.status(200).json({ success: true, message: 'If an account exists for that email, a reset code has been sent.' });
  }
  async resetPassword(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { email, token, password } = req.body || {};
      await customerService.resetPassword(email, token, password);
      return res.status(200).json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Password reset failed' });
    }
  }
}

export const customerController = new CustomerController();
