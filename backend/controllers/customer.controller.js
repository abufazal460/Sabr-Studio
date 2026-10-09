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
    try {
      const { name, phone } = req.body || {};
      const { Customer } = await import('../models/customer.model.js');
      const mongoose = (await import('mongoose')).default;
      let updated = null;
      if (mongoose.connection?.readyState === 1) {
        updated = await Customer.findByIdAndUpdate(
          req.customer.id,
          { ...(name !== undefined ? { name: String(name).trim() } : {}), ...(phone !== undefined ? { phone: String(phone).trim() } : {}) },
          { new: true, runValidators: true }
        ).lean();
      }
      const payload = updated || { ...req.customerDb, name: name ?? req.customerDb?.name, phone: phone ?? req.customerDb?.phone };
      if (!updated && req.customerDb && typeof req.customerDb === 'object' && !req.customerDb.save) {
        if (name !== undefined) req.customerDb.name = String(name).trim();
        if (phone !== undefined) req.customerDb.phone = String(phone).trim();
      } else if (!updated && req.customerDb?.save) {
        if (name !== undefined) req.customerDb.name = String(name).trim();
        if (phone !== undefined) req.customerDb.phone = String(phone).trim();
        try { await req.customerDb.save(); } catch {}
      }
      return res.status(200).json({ success: true, data: { customer: { ...req.customer, name: payload.name ?? req.customer.name, phone: payload.phone ?? req.customer.phone } } });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Profile update failed' });
    }
  }
}

export const customerController = new CustomerController();
