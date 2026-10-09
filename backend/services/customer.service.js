import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  // Fail-closed: never sign/verify customer sessions with a public fallback in production.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not configured');
  }
  return 'sabr_studio_dev_jwt_secret_key_8f7b2c9d1e4a5f6e';
}
function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '30d';
}

const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const RESET_MAX_ATTEMPTS = 5;
const hashResetToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const normalizeEmail = (v) => String(v || '').toLowerCase().trim();
const isValidEmail = (v) => /^\S+@\S+\.\S+$/.test(v);

const inMemoryCustomers = [];
const memKey = (c) => String(c.email || '').toLowerCase();

function sanitize(c) {
  if (!c) return null;
  const id = c._id ? String(c._id) : c.id;
  return {
    id, _id: id,
    name: c.name, email: c.email,
    phone: c.phone || '',
    avatar: c.avatar || '',
    role: 'customer',
    status: c.status || 'active',
    googleId: c.googleId || null,
    addresses: c.addresses || [],
    lastLoginAt: c.lastLoginAt || null,
  };
}

class CustomerService {
  generateToken(c) {
    const id = c._id ? String(c._id) : c.id;
    return jwt.sign({ id, role: 'customer', kind: 'customer' }, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
  }
  verifyToken(t) { return jwt.verify(t, getJwtSecret()); }

  async findById(id) {
    if (!id) return null;
    if (mongoose.connection?.readyState === 1) {
      try {
        const doc = await Customer.findById(id);
        if (doc) return doc;
      } catch {}
    }
    return inMemoryCustomers.find((c) => String(c.id) === String(id) || String(c._id) === String(id)) || null;
  }

  async register({ name, email, password, phone }) {
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName.length < 2) { const e = new Error('Please enter your full name.'); e.statusCode = 400; throw e; }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { const e = new Error('Please enter a valid email address.'); e.statusCode = 400; throw e; }
    if (!password || String(password).length < 6) { const e = new Error('Password must be at least 6 characters.'); e.statusCode = 400; throw e; }
    const connected = mongoose.connection?.readyState === 1;
    if (connected) {
      const exists = await Customer.findOne({ email: cleanEmail });
      if (exists) { const e = new Error('An account with this email already exists. Please log in.'); e.statusCode = 409; throw e; }
      const doc = await Customer.create({ name: cleanName, email: cleanEmail, password, phone: String(phone || '') });
      doc.lastLoginAt = new Date(); await doc.save();
      return { customer: sanitize(doc.toObject()), token: this.generateToken(doc) };
    }
    if (inMemoryCustomers.some((c) => memKey(c) === cleanEmail)) { const e = new Error('An account with this email already exists. Please log in.'); e.statusCode = 409; throw e; }
    const hash = await bcrypt.hash(String(password), 10);
    const rec = { id: `cust-${Date.now()}`, _id: `cust-${Date.now()}`, name: cleanName, email: cleanEmail, password: hash, phone: String(phone || ''), addresses: [], status: 'active', lastLoginAt: new Date() };
    inMemoryCustomers.unshift(rec);
    return { customer: sanitize(rec), token: this.generateToken(rec) };
  }

  async login(email, password) {
    const cleanEmail = String(email || '').toLowerCase().trim();
    let doc = null; let hash = null;
    if (mongoose.connection?.readyState === 1) {
      try { doc = await Customer.findOne({ email: cleanEmail }).select('+password'); if (doc) hash = doc.password; } catch {}
    }
    if (!doc) {
      const mem = inMemoryCustomers.find((c) => memKey(c) === cleanEmail);
      if (mem) { doc = mem; hash = mem.password; }
    }
    if (!doc || !hash) {
      await bcrypt.compare(String(password || ''), '$2a$10$LuUvjIDZM37R/uP02T1CF.JWHBdhC9HdSmx.KpZoYyNvMGIKx6nvu');
      return null;
    }
    const ok = await bcrypt.compare(String(password || ''), hash);
    if (!ok) return null;
    if (doc.status === 'disabled') { const e = new Error('Account is disabled'); e.statusCode = 403; throw e; }
    doc.lastLoginAt = new Date();
    if (typeof doc.save === 'function') { try { await doc.save(); } catch {} }
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return { customer: sanitize(plain), token: this.generateToken(doc) };
  }

  async googleLogin({ googleId, email, name, avatar }) {
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail) { const e = new Error('Google account email is required.'); e.statusCode = 400; throw e; }
    const connected = mongoose.connection?.readyState === 1;
    if (connected) {
      let doc = googleId ? await Customer.findOne({ googleId }) : null;
      if (!doc) doc = await Customer.findOne({ email: cleanEmail });
      if (!doc) {
        doc = await Customer.create({ name: String(name || cleanEmail.split('@')[0]), email: cleanEmail, googleId: googleId || null, avatar: avatar || '' });
      } else {
        if (googleId && !doc.googleId) doc.googleId = googleId;
        if (avatar && !doc.avatar) doc.avatar = avatar;
        doc.lastLoginAt = new Date(); await doc.save();
      }
      return { customer: sanitize(doc.toObject()), token: this.generateToken(doc) };
    }
    let mem = (googleId && inMemoryCustomers.find((c) => c.googleId === googleId)) || inMemoryCustomers.find((c) => memKey(c) === cleanEmail);
    if (!mem) {
      mem = { id: `cust-${Date.now()}`, _id: `cust-${Date.now()}`, name: String(name || cleanEmail.split('@')[0]), email: cleanEmail, password: null, googleId: googleId || null, avatar: avatar || '', phone: '', addresses: [], status: 'active', lastLoginAt: new Date() };
      inMemoryCustomers.unshift(mem);
    } else { mem.lastLoginAt = new Date(); }
    return { customer: sanitize(mem), token: this.generateToken(mem) };
  }

  async _findCustomerByEmail(cleanEmail) {
    if (mongoose.connection?.readyState === 1) {
      try { return await Customer.findOne({ email: cleanEmail }); } catch { return null; }
    }
    return inMemoryCustomers.find((c) => memKey(c) === cleanEmail) || null;
  }

  async _sendResetEmail(email, name, token) {
    try {
      const { sendEnquiryEmail } = await import('./emailjs.service.js');
      await sendEnquiryEmail({
        name: name || 'Sabr Studio customer',
        phone: '',
        email,
        projectType: 'Password reset request',
        message: `Your Sabr Studio password-reset code is: ${token}\n\nThis code expires in 15 minutes and can be used once. If you did not request this, you can safely ignore this email.`,
      }, {});
      return true;
    } catch (err) {
      console.error('[CustomerService] reset email failed:', err?.code || err?.message);
      return false;
    }
  }

  /**
   * Enumeration-safe: always resolves {sent:true} whether or not the account
   * exists, and never reveals delivery status to the caller.
   */
  async requestPasswordReset(email) {
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) return { sent: true };
    const doc = await this._findCustomerByEmail(cleanEmail);
    if (!doc) return { sent: true };
    const now = Date.now();
    const lastSent = doc.passwordReset?.lastSentAt ? new Date(doc.passwordReset.lastSentAt).getTime() : 0;
    if (lastSent && now - lastSent < RESET_RESEND_COOLDOWN_MS) return { sent: true }; // cooldown, silent
    const token = crypto.randomBytes(32).toString('hex');
    const patch = {
      passwordReset: {
        tokenHash: hashResetToken(token),
        expiresAt: new Date(now + RESET_TTL_MS),
        attempts: 0,
        lastSentAt: new Date(now),
        usedAt: null,
      },
    };
    if (mongoose.connection?.readyState === 1 && typeof doc.save === 'function') {
      doc.passwordReset = patch.passwordReset;
      try { await doc.save(); } catch {}
    } else {
      doc.passwordReset = patch.passwordReset;
    }
    await this._sendResetEmail(cleanEmail, doc.name, token);
    return { sent: true };
  }

  async resetPassword(email, token, newPassword) {
    const cleanEmail = normalizeEmail(email);
    const raw = String(token || '').trim();
    if (!isValidEmail(cleanEmail) || !raw) { const e = new Error('Invalid or expired reset code.'); e.statusCode = 400; throw e; }
    if (!newPassword || String(newPassword).length < 6) { const e = new Error('Password must be at least 6 characters.'); e.statusCode = 400; throw e; }
    const doc = await this._findCustomerByEmail(cleanEmail);
    const pr = doc?.passwordReset;
    const invalid = () => { const e = new Error('Invalid or expired reset code.'); e.statusCode = 400; throw e; };
    if (!doc || !pr || !pr.tokenHash || !pr.expiresAt) invalid();
    if (pr.usedAt) invalid();
    if (new Date(pr.expiresAt).getTime() < Date.now()) invalid();
    if ((pr.attempts || 0) >= RESET_MAX_ATTEMPTS) invalid();
    if (hashResetToken(raw) !== pr.tokenHash) {
      pr.attempts = (pr.attempts || 0) + 1;
      if (typeof doc.save === 'function') { try { await doc.save(); } catch {} }
      invalid();
    }
    // Valid: rotate password, invalidate token (single-use).
    doc.password = String(newPassword);
    pr.tokenHash = null; pr.usedAt = new Date(); pr.attempts = 0; pr.expiresAt = null;
    if (mongoose.connection?.readyState === 1 && typeof doc.save === 'function') {
      await doc.save(); // pre-save hook hashes the password
    } else {
      doc.password = await bcrypt.hash(String(newPassword), 10);
    }
    return { customer: sanitize(typeof doc.toObject === 'function' ? doc.toObject() : doc) };
  }

  /**
   * Update own profile only (id comes from the verified JWT, never the body).
   * Email changes are sensitive: require the current password (re-auth) and
   * enforce uniqueness + normalization.
   */
  async updateProfile(id, { name, phone, email, currentPassword }) {
    const connected = mongoose.connection?.readyState === 1;
    let doc = null;
    if (connected) { try { doc = await Customer.findById(id).select('+password'); } catch { doc = null; } }
    if (!doc) doc = inMemoryCustomers.find((c) => String(c.id) === String(id) || String(c._id) === String(id)) || null;
    if (!doc) { const e = new Error('Account not found.'); e.statusCode = 404; throw e; }

    const nextEmail = email !== undefined ? normalizeEmail(email) : undefined;
    if (nextEmail !== undefined && nextEmail !== normalizeEmail(doc.email)) {
      if (!isValidEmail(nextEmail)) { const e = new Error('Please enter a valid email address.'); e.statusCode = 400; throw e; }
      // Re-authentication for sensitive identity change.
      if (!doc.password) { const e = new Error('Email cannot be changed on a Google-only account.'); e.statusCode = 400; throw e; }
      const okPw = await bcrypt.compare(String(currentPassword || ''), doc.password);
      if (!okPw) { const e = new Error('Current password is incorrect.'); e.statusCode = 403; throw e; }
      const clash = await this._findCustomerByEmail(nextEmail);
      if (clash && String(clash._id || clash.id) !== String(doc._id || doc.id)) {
        const e = new Error('An account with this email already exists.'); e.statusCode = 409; throw e;
      }
      doc.email = nextEmail;
    }
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2) { const e = new Error('Please enter your full name.'); e.statusCode = 400; throw e; }
      doc.name = cleanName;
    }
    if (phone !== undefined) doc.phone = String(phone).trim();

    if (connected && typeof doc.save === 'function') { await doc.save(); }
    return { customer: sanitize(typeof doc.toObject === 'function' ? doc.toObject() : doc) };
  }
}

export const customerService = new CustomerService();
export const customerAuthService = customerService;
