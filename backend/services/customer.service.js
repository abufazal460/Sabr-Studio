import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'sabr_studio_dev_jwt_secret_key_8f7b2c9d1e4a5f6e';
}
function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '30d';
}

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
}

export const customerService = new CustomerService();
export const customerAuthService = customerService;
