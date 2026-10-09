import { customerService } from '../services/customer.service.js';

function extractCustomerToken(req) {
  if (req.cookies?.sabr_customer) return req.cookies.sabr_customer;
  if (req.headers?.cookie) {
    const parts = String(req.headers.cookie).split(';');
    for (const p of parts) {
      const i = p.indexOf('=');
      if (i > -1 && p.slice(0, i).trim() === 'sabr_customer') return decodeURIComponent(p.slice(i + 1).trim());
    }
  }
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

export async function protectCustomer(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  const token = extractCustomerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Please log in to continue checkout.', code: 'CUSTOMER_AUTH_REQUIRED' });
  }
  let decoded;
  try { decoded = customerService.verifyToken(token); }
  catch {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'CUSTOMER_TOKEN_INVALID' });
  }
  if (!decoded || decoded.kind !== 'customer' || !decoded.id) {
    return res.status(401).json({ success: false, message: 'Invalid session. Please log in again.', code: 'CUSTOMER_TOKEN_INVALID' });
  }
  const doc = await customerService.findById(decoded.id);
  if (!doc) return res.status(401).json({ success: false, message: 'Account no longer exists.', code: 'CUSTOMER_NOT_FOUND' });
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  if (plain.status === 'disabled') return res.status(403).json({ success: false, message: 'Account is disabled.' });
  const id = plain._id ? String(plain._id) : String(plain.id);
  req.customer = { id, name: plain.name, email: plain.email, phone: plain.phone || '', avatar: plain.avatar || '', role: 'customer', status: plain.status, addresses: plain.addresses || [] };
  req.customerDb = doc;
  next();
}
