import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[FATAL] JWT_SECRET is missing in production. Process exiting.');
      process.exit(1);
    }
    throw new Error('JWT_SECRET is not configured');
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    console.error('[FATAL] JWT_SECRET must be at least 32 characters long in production. Process exiting.');
    process.exit(1);
  }
  return secret;
}
function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '30d';
}

/**
 * Profile fields a customer is allowed to change on their own account.
 * Everything else (email, role, status, googleId, ...) is server-owned.
 */
export const CUSTOMER_EDITABLE_PROFILE_FIELDS = ['name', 'phone'];

const normalizePhone = (v) => String(v || '').replace(/[^\d+]/g, '').trim();
const isValidPhone = (v) => /^\+?\d{10,15}$/.test(v);

const inMemoryCustomers = [];

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
    emailVerified: c.emailVerified !== false,
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
      } catch {
        /* ignore lookup errors */
      }
    }
    return inMemoryCustomers.find((c) => String(c.id) === String(id) || String(c._id) === String(id)) || null;
  }

  /**
   * Google Sign-In is the only way in. The identity key is the verified
   * Google `sub` claim - accounts are NEVER linked by email alone, because
   * an unverified email claim could otherwise take over an existing account.
   */
  async googleLogin({ googleId, email, name, avatar }) {
    const sub = String(googleId || '').trim();
    if (!sub) { const e = new Error('Google account id is required.'); e.statusCode = 400; throw e; }
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail) { const e = new Error('Google account email is required.'); e.statusCode = 400; throw e; }
    const connected = mongoose.connection?.readyState === 1;
    if (connected) {
      let doc = await Customer.findOne({ googleId: sub });
      if (!doc) {
        try {
          doc = await Customer.create({
            name: String(name || cleanEmail.split('@')[0]),
            email: cleanEmail,
            googleId: sub,
            emailVerified: true,
            avatar: avatar || '',
          });
        } catch (err) {
          // Unique-index clash: a legacy account already owns this email.
          // Accounts are never linked by email, so we refuse and let the
          // customer use the sign-in method that created the original account.
          if (err?.code === 11000) {
            const e = new Error('This email is already registered with a different sign-in method.');
            e.statusCode = 409; e.code = 'EMAIL_ALREADY_REGISTERED'; throw e;
          }
          throw err;
        }
      } else {
        if (doc.status === 'disabled') { const e = new Error('Account is disabled'); e.statusCode = 403; throw e; }
        // The email is owned by Google, but the customer may have changed the
        // name/phone in their profile - never overwrite those here.
        if (avatar && !doc.avatar) doc.avatar = avatar;
        doc.lastLoginAt = new Date();
        await doc.save();
      }
      return { customer: sanitize(doc.toObject()), token: this.generateToken(doc) };
    }
    let mem = inMemoryCustomers.find((c) => c.googleId === sub);
    if (!mem) {
      mem = { id: `cust-${Date.now()}`, _id: `cust-${Date.now()}`, name: String(name || cleanEmail.split('@')[0]), email: cleanEmail, googleId: sub, emailVerified: true, avatar: avatar || '', phone: '', addresses: [], status: 'active', lastLoginAt: new Date() };
      inMemoryCustomers.unshift(mem);
    } else { mem.lastLoginAt = new Date(); }
    return { customer: sanitize(mem), token: this.generateToken(mem) };
  }

  /**
   * Update own profile only (id comes from the verified JWT, never the body).
   * Only the allowlisted fields may change; email is owned by Google and is
   * therefore rejected here.
   */
  async updateProfile(id, payload = {}) {
    const connected = mongoose.connection?.readyState === 1;
    let doc = null;
    if (connected) { try { doc = await Customer.findById(id); } catch { doc = null; } }
    if (!doc) doc = inMemoryCustomers.find((c) => String(c.id) === String(id) || String(c._id) === String(id)) || null;
    if (!doc) { const e = new Error('Account not found.'); e.statusCode = 404; throw e; }

    const body = payload && typeof payload === 'object' ? payload : {};
    const rejected = Object.keys(body).filter((k) => !CUSTOMER_EDITABLE_PROFILE_FIELDS.includes(k));
    if (rejected.length) {
      const e = new Error(`Field(s) not editable: ${rejected.join(', ')}.`);
      e.statusCode = 400; e.code = 'FIELD_NOT_EDITABLE'; throw e;
    }

    if (body.name !== undefined) {
      const cleanName = String(body.name).trim();
      if (cleanName.length < 2) { const e = new Error('Please enter your full name.'); e.statusCode = 400; throw e; }
      doc.name = cleanName;
    }
    if (body.phone !== undefined) {
      const cleanPhone = normalizePhone(body.phone);
      if (cleanPhone && !isValidPhone(cleanPhone)) {
        const e = new Error('Please enter a valid phone number.'); e.statusCode = 400; throw e;
      }
      doc.phone = cleanPhone;
    }

    if (connected && typeof doc.save === 'function') { await doc.save(); }
    return { customer: sanitize(typeof doc.toObject === 'function' ? doc.toObject() : doc) };
  }
}

export const customerService = new CustomerService();
export const customerAuthService = customerService;