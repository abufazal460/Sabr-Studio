import crypto from 'crypto';
import { Order, inMemoryOrders } from '../models/order.model.js';
import { retailService } from './retail.service.js';
import { projectService } from './project.service.js';
import { fallbackOrders } from '../utils/fallbackStorage.js';
import { createRazorpayOrder, verifyCheckoutSignature, verifyWebhookSignature } from './razorpay.service.js';
import { ORDER_STATUS_LIST, ORDER_TRANSITIONS } from '../constants/orderStatus.js';

function genOrderNumber() {
  const y = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SABR-ORD-${y}-${rand}`;
}
function normId(v) { return String(v ?? '').trim(); }
function asId(doc) { return String(doc._id || doc.id); }
function toPaise(inr) { return Math.round(Number(inr) * 100); }

export const orderService = {
  /**
   * Authenticated checkout: validate cart server-side, snapshot address,
   * create pending order + real Razorpay order. Never trusts browser totals.
   */
  async createCheckoutSession(body, customerCtx, idempotencyKey) {
    const { items, addressId, address } = body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new Error('Cart cannot be empty for checkout');
      err.statusCode = 400;
      throw err;
    }
    if (items.length > 50) { const e = new Error('Too many items in one order'); e.statusCode = 400; throw e; }

    // Idempotency: same key returns same pending order (no duplicates)
    if (idempotencyKey) {
      const dup = await this._findByIdempotency(idempotencyKey);
      if (dup) return this._checkoutResponse(dup);
    }

    // Resolve delivery address: saved addressId or inline address, then snapshot
    const snapshot = await this._resolveAddressSnapshot(customerCtx, addressId, address);

    let subtotal = 0;
    const orderItems = [];
    const priceChanges = [];
    for (const item of items) {
      const id = item.itemId || item.productId || item.product || item.id;
      const qty = Math.floor(Number(item.quantity) || 1);
      if (!id || qty < 1 || qty > 20) { const e = new Error(`Invalid item or quantity for "${id || 'unknown'}"`); e.statusCode = 400; throw e; }
      let sourceItem = await retailService.getPublicRetailBySlug(normId(id));
      let itemType = 'retail';
      if (!sourceItem) sourceItem = await retailService.getAdminRetailById(normId(id));
      if (!sourceItem) {
        const proj = await projectService.getPublicProjectBySlug(normId(id));
        if (proj && proj.price) { sourceItem = proj; itemType = 'project'; }
      }
      if (!sourceItem) { const e = new Error(`Item "${id}" is unavailable or no longer in catalog`); e.statusCode = 404; throw e; }
      if (sourceItem.published === false) { const e = new Error(`"${sourceItem.title}" is no longer available`); e.statusCode = 409; throw e; }
      if (sourceItem.inStock === false || sourceItem.availability === false) { const e = new Error(`"${sourceItem.title}" is out of stock`); e.statusCode = 409; throw e; }
      const unitPrice = Number(sourceItem.price) || 0;
      const clientPrice = Number(item.unitPrice ?? item.price);
      if (clientPrice && Math.abs(clientPrice - unitPrice) > 0.01) priceChanges.push({ id: normId(id), name: sourceItem.title, oldPrice: clientPrice, newPrice: unitPrice });
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      orderItems.push({
        itemId: String(sourceItem.id || sourceItem._id),
        productId: String(sourceItem.id || sourceItem._id),
        itemType, name: sourceItem.title, title: sourceItem.title,
        variant: normId(item.variant || item.size || ''),
        quantity: qty, unitPrice, price: unitPrice, lineTotal,
        image: sourceItem.image || sourceItem.coverImage || (sourceItem.images && sourceItem.images[0]?.url) || '',
      });
    }
    if (subtotal <= 0) { const e = new Error('Order total must be greater than zero'); e.statusCode = 400; throw e; }

    // Legacy unauthenticated entry (kept for admin-compat): still validates server-side
    const ownerId = customerCtx?.id || null;
    const ownerEmail = customerCtx?.email || body?.customer?.email || '';
    let orderNumber = genOrderNumber();
    const rzp = await createRazorpayOrder({ amountPaise: toPaise(subtotal), currency: 'INR', receipt: orderNumber });
    // collision-safe regenerate if receipt already used
    const orderRecord = {
      orderNumber, user: ownerId, userEmail: String(ownerEmail || '').toLowerCase(),
      customer: { name: snapshot.fullName || customerCtx?.name || 'Client', email: String(ownerEmail || customerCtx?.email || ''), phone: snapshot.phone || customerCtx?.phone || '', address: snapshot.line || '' },
      deliveryAddress: snapshot,
      items: orderItems, subtotal, shipping: 0, amount: subtotal, totalAmount: subtotal, currency: 'INR',
      payment: { provider: 'razorpay', razorpayOrderId: rzp.id, razorpayPaymentId: null, razorpaySignature: null, verified: false, method: '', failureReason: '' },
      paymentStatus: 'pending', orderStatus: 'pending', trackingId: null,
      idempotencyKey: idempotencyKey || null,
      statusHistory: [{ kind: 'order', from: '', to: 'pending', at: new Date(), by: 'system', note: 'Order created, awaiting payment' }],
    };
    const saved = await this._persist(orderRecord, orderNumber);
    return { ...this._checkoutResponse(saved), priceChanges };
  },

  // Legacy public wrapper (no auth) — delegates with null customer
  async createCheckoutSessionLegacy(body) { return this.createCheckoutSession(body, null, null); },

  /**
   * Verify Razorpay payment signature
   * Finalizes paymentStatus strictly via signature verification.
   */
  async verifyPayment(body, customerCtx) {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body || {};
    if (!orderId && !razorpayOrderId) {
      const err = new Error('Order identification required for payment verification');
      err.statusCode = 400;
      throw err;
    }

    // Look up order
    const isMongoConnected = Order.db?.readyState === 1;
    let order;

    if (isMongoConnected) {
      order = await Order.findOne({
        $or: [
          { _id: orderId?.match(/^[0-9a-fA-F]{24}$/) ? orderId : null },
          { id: orderId },
          { 'payment.razorpayOrderId': razorpayOrderId },
        ],
      }).lean();
    }

    if (!order) {
      // Check fallback storage
      order = fallbackOrders.findOne({
        _id: orderId,
        id: orderId,
        'payment.razorpayOrderId': razorpayOrderId,
      });
    }

    if (!order) {
      const err = new Error('Order not found for verification');
      err.statusCode = 404;
      throw err;
    }
    if (customerCtx && order.user && String(order.user) !== String(customerCtx.id)) {
      const e = new Error('You do not own this order'); e.statusCode = 403; throw e;
    }
    if (order.paymentStatus === 'paid' && order.payment?.verified) {
      return { verified: true, orderId: order._id || order.id, status: 'paid', order: this._publicOrder(order), alreadyVerified: true };
    }

    let isValid = false;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const bodyStr = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expected = crypto.createHmac('sha256', keySecret).update(bodyStr).digest('hex');
      const a = Buffer.from(expected); const b = Buffer.from(String(razorpaySignature));
      isValid = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else if (!keySecret && String(razorpayOrderId || '').startsWith('order_mock_')) {
      isValid = Boolean(razorpayPaymentId); // local mock mode only
    }

    if (isValid) {
      const paid = await this._markPaid(order, { razorpayOrderId, razorpayPaymentId, razorpaySignature });
      this._sendConfirmationEmail(paid).catch(() => {});
      return { verified: true, orderId: paid._id || paid.id, status: 'paid', order: this._publicOrder(paid) };
    } else {
      await this._markFailed(order, 'SIGNATURE_MISMATCH');
      const err = new Error('Payment signature verification failed');
      err.statusCode = 400;
      throw err;
    }
  },

  // ---- internal helpers (idempotency, address snapshot, persistence) ----
  async _findByIdempotency(key) {
    if (!key) return null;
    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) return Order.findOne({ idempotencyKey: key }).lean();
    return fallbackOrders.findAll().find((o) => o.idempotencyKey === key) || inMemoryOrders.find((o) => o.idempotencyKey === key) || null;
  },
  async _findByRazorpayOrder(rzpOrderId) {
    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) return Order.findOne({ 'payment.razorpayOrderId': rzpOrderId }).lean();
    return fallbackOrders.findAll().find((o) => o.payment?.razorpayOrderId === rzpOrderId) || inMemoryOrders.find((o) => o.payment?.razorpayOrderId === rzpOrderId) || null;
  },
  async _resolveAddressSnapshot(customerCtx, addressId, inline) {
    const c = (v) => String(v ?? '').trim();
    if (addressId && customerCtx?.id) {
      const { Customer } = await import('../models/customer.model.js');
      const mongoose = (await import('mongoose')).default;
      let addr = null;
      if (mongoose.connection?.readyState === 1) {
        const doc = await Customer.findById(customerCtx.id).lean();
        addr = (doc?.addresses || []).find((a) => String(a._id) === String(addressId));
      } else if (customerCtx.addresses) {
        addr = customerCtx.addresses.find((a) => String(a._id || a.id) === String(addressId));
      }
      if (!addr) { const e = new Error('Selected delivery address not found'); e.statusCode = 400; throw e; }
      return { fullName: c(addr.fullName), phone: c(addr.phone), email: c(customerCtx.email), house: c(addr.house), street: c(addr.street), landmark: c(addr.landmark), city: c(addr.city), state: c(addr.state), pincode: c(addr.pincode), country: c(addr.country) || 'India', line: [c(addr.house), c(addr.street), c(addr.landmark), c(addr.city), c(addr.state), c(addr.pincode), c(addr.country) || 'India'].filter(Boolean).join(', ') };
    }
    const a = inline || {};
    const errs = [];
    if (c(a.fullName || customerCtx?.name).length < 2) errs.push('Full name is required.');
    if (!/^\+?\d[\d\s\-().]{7,17}$/.test(c(a.phone || customerCtx?.phone))) errs.push('Valid phone number is required.');
    if (c(a.house).length < 1) errs.push('House/flat number is required.');
    if (c(a.street).length < 3) errs.push('Street/locality is required.');
    if (c(a.city).length < 2) errs.push('City is required.');
    if (c(a.state).length < 2) errs.push('State is required.');
    if (!/^[A-Za-z0-9][A-Za-z0-9 \-]{3,11}$/.test(c(a.pincode))) errs.push('Valid PIN/postal code is required.');
    if (errs.length) { const e = new Error(errs[0]); e.statusCode = 400; throw e; }
    return { fullName: c(a.fullName || customerCtx?.name), phone: c(a.phone || customerCtx?.phone), email: c(a.email || customerCtx?.email), house: c(a.house), street: c(a.street), landmark: c(a.landmark), city: c(a.city), state: c(a.state), pincode: c(a.pincode), country: c(a.country) || 'India', line: [c(a.house), c(a.street), c(a.landmark), c(a.city), c(a.state), c(a.pincode)].filter(Boolean).join(', ') };
  },
  async _persist(record, orderNumber) {
    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) {
      try { const doc = await Order.create(record); return doc.toObject(); }
      catch (err) {
        if (err.code === 11000 && record.idempotencyKey) {
          const dup = await Order.findOne({ idempotencyKey: record.idempotencyKey }).lean();
          if (dup) return dup;
        }
        if (err.code === 11000) {
          record.orderNumber = genOrderNumber();
          const doc = await Order.create(record); return doc.toObject();
        }
        throw err;
      }
    }
    return fallbackOrders.add(record);
  },
  _checkoutResponse(saved) {
    const { default: RazorpayKey } = { default: process.env.RAZORPAY_KEY_ID || '' };
    return {
      orderId: saved._id || saved.id, id: saved._id || saved.id,
      orderNumber: saved.orderNumber, amount: saved.amount, currency: saved.currency || 'INR',
      amountPaise: Math.round(Number(saved.amount) * 100),
      razorpayOrderId: saved.payment?.razorpayOrderId, keyId: RazorpayKey,
      itemsCount: (saved.items || []).length, paymentStatus: saved.paymentStatus, orderStatus: saved.orderStatus,
    };
  },
  _publicOrder(o) {
    return { ...o, id: o.id || (o._id && String(o._id)) };
  },
  async _writeOrder(order, patch, historyEntry) {
    const isMongoConnected = Order.db?.readyState === 1;
    const id = order._id || order.id || order.orderNumber;
    const update = { ...patch, updatedAt: new Date() };
    if (isMongoConnected) {
      const upd = await Order.findOneAndUpdate(
        { $or: [{ _id: String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null }, { orderNumber: order.orderNumber }] },
        { $set: update, ...(historyEntry ? { $push: { statusHistory: historyEntry } } : {}) },
        { new: true }
      ).lean();
      if (upd) return upd;
    }
    const fb = fallbackOrders.update(id, update);
    if (fb) return fb;
    Object.assign(order, update);
    return order;
  },
  async _markPaid(order, { razorpayOrderId, razorpayPaymentId, razorpaySignature, mock }) {
    return this._writeOrder(order, {
      paymentStatus: 'paid', orderStatus: 'confirmed',
      payment: { ...(order.payment || {}), razorpayOrderId: razorpayOrderId || order.payment?.razorpayOrderId, razorpayPaymentId, razorpaySignature: razorpaySignature || (mock ? 'mock' : order.payment?.razorpaySignature), verified: true, failureReason: '' },
    }, { kind: 'payment', from: order.paymentStatus || 'pending', to: 'paid', at: new Date(), by: 'razorpay', note: mock ? 'Mock-mode payment recorded' : 'Signature verified' });
  },
  async _markFailed(order, reason) {
    // Never downgrade an already-paid order
    if (order.paymentStatus === 'paid') return order;
    return this._writeOrder(order, {
      paymentStatus: 'failed',
      payment: { ...(order.payment || {}), verified: false, failureReason: String(reason || 'FAILED') },
    }, { kind: 'payment', from: order.paymentStatus || 'pending', to: 'failed', at: new Date(), by: 'razorpay', note: String(reason || '') });
  },
  async handleWebhook(rawBody, headers, parsed) {
    const sig = headers['x-razorpay-signature'] || headers['X-Razorpay-Signature'];
    if (!verifyWebhookSignature(rawBody, sig)) { const e = new Error('Invalid webhook signature'); e.statusCode = 400; throw e; }
    const event = parsed?.event || '';
    const entity = parsed?.payload?.payment?.entity || parsed?.payload?.order?.entity || {};
    const rzpOrderId = entity.order_id || entity.id || null;
    if (!rzpOrderId) return { ignored: true };
    const order = await this._findByRazorpayOrder(rzpOrderId);
    if (!order) return { ignored: true };
    if (/payment\.captured|order\.paid/i.test(event)) {
      if (order.paymentStatus === 'paid') return { orderNumber: order.orderNumber, alreadyPaid: true };
      const updated = await this._markPaid(order, { razorpayOrderId: rzpOrderId, razorpayPaymentId: entity.id || order.payment?.razorpayPaymentId, razorpaySignature: 'webhook' });
      this._sendConfirmationEmail(updated).catch(() => {});
      return { orderNumber: order.orderNumber, paid: true };
    }
    if (/payment\.failed/i.test(event)) {
      await this._markFailed(order, entity.error_description || 'PAYMENT_FAILED');
      return { orderNumber: order.orderNumber, failed: true };
    }
    return { ignored: true, event };
  },
  async _sendConfirmationEmail(order) {
    try {
      const { sendEnquiryEmail } = await import('./emailjs.service.js');
      if (order.emailSent) return;
      await sendEnquiryEmail({ name: order.customer?.name || 'Customer', phone: order.customer?.phone || '', email: order.customer?.email || order.userEmail || '', projectType: `Order ${order.orderNumber}`, message: `Order ${order.orderNumber} confirmed. Amount ${order.currency || 'INR'} ${order.amount}. Items: ${(order.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ')}` }, {});
      await this._writeOrder(order, { emailSent: true, emailSentAt: new Date() }, null);
    } catch { /* email never reverses payment */ }
  },
  async getAdminOrders() {
    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) {
      const items = await Order.find().sort({ createdAt: -1 }).lean();
      return items.map((doc) => ({
        ...doc,
        id: doc.id || doc._id?.toString(),
      }));
    }
    // Fallback to persistent storage, then in-memory
    const fallbackData = fallbackOrders.findAll();
    if (fallbackData.length > 0) {
      return fallbackData;
    }
    return [...inMemoryOrders];
  },

  /**
   * Get order by ID (strictly admin-only)
   */
  async getAdminOrderById(id) {
    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) {
      return await Order.findOne({
        $or: [
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { id },
          { orderNumber: id },
        ],
      }).lean();
    }
    // Check fallback storage first
    const fallbackOrder = fallbackOrders.findOne({
      _id: id,
      id: id,
      orderNumber: id,
    });
    if (fallbackOrder) {
      return fallbackOrder;
    }
    return (
      inMemoryOrders.find(
        (o) => o.id === id || o._id === id || o.orderNumber === id
      ) || null
    );
  },

  /**
   * Update orderStatus ONLY (strictly admin-only)
   * References: prompts/06-features.md §5.6
   * Security mandate: Admins CANNOT manually set paymentStatus or amount.
   * Rejects any attempt to write paymentStatus.
   */
  async updateOrderStatus(id, newOrderStatus, disallowedPayload = {}) {
    if (disallowedPayload.paymentStatus !== undefined) {
      const err = new Error(
        'Security policy violation: paymentStatus is system-controlled via Razorpay and cannot be modified by admin'
      );
      err.statusCode = 403;
      throw err;
    }

    if (disallowedPayload.amount !== undefined) {
      const err = new Error(
        'Security policy violation: order amount is immutable and cannot be modified'
      );
      err.statusCode = 403;
      throw err;
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(newOrderStatus)) {
      const err = new Error(
        `Invalid orderStatus: "${newOrderStatus}". Must be one of: ${validStatuses.join(', ')}`
      );
      err.statusCode = 400;
      throw err;
    }

    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) {
      const updated = await Order.findOneAndUpdate(
        {
          $or: [
            { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { id },
            { orderNumber: id },
          ],
        },
        { $set: { orderStatus: newOrderStatus } },
        { new: true, runValidators: true }
      ).lean();
      return updated;
    }

    const fallbackUpdated = fallbackOrders.update(id, { orderStatus: newOrderStatus });
    if (fallbackUpdated) return fallbackUpdated;

    const ord = inMemoryOrders.find(
      (o) => o.id === id || o._id === id || o.orderNumber === id
    );
    if (!ord) return null;

    ord.orderStatus = newOrderStatus;
    ord.updatedAt = new Date();
    return ord;
  },

  async updateTrackingId(id, trackingId) {
    const clean = String(trackingId ?? '').trim();
    if (clean && !/^[A-Za-z0-9][A-Za-z0-9\-_ ]{3,63}$/.test(clean)) {
      const e = new Error('Invalid tracking ID format'); e.statusCode = 400; throw e;
    }
    const snap = { trackingId: clean || null };
    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) {
      const upd = await Order.findOneAndUpdate(
        { $or: [{ _id: String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null }, { id }, { orderNumber: id }] },
        { $set: snap, $push: { statusHistory: { kind: 'tracking', from: '', to: clean || '', at: new Date(), by: 'admin', note: 'Tracking updated' } } },
        { new: true }
      ).lean();
      if (upd) return upd;
    }
    const fb = fallbackOrders.update(id, snap);
    if (fb) return fb;
    const ord = inMemoryOrders.find((o) => o.id === id || o._id === id || o.orderNumber === id);
    if (!ord) return null;
    ord.trackingId = snap.trackingId; ord.updatedAt = new Date();
    return ord;
  },

  async getCustomerOrders(customerId) {
    const isMongoConnected = Order.db?.readyState === 1;
    if (isMongoConnected) {
      // customerId is req.customer ({id,email,...}); match on the ObjectId string
      // and/or the lowercased email. Guard the ObjectId cast so a non-hex id
      // never throws a CastError (which would 500 the whole order-history page).
      const uid = String(customerId?.id || customerId || '');
      const email = String(customerId?.email || '').toLowerCase();
      const or = [];
      if (/^[0-9a-fA-F]{24}$/.test(uid)) or.push({ user: uid });
      if (email) or.push({ userEmail: email });
      if (!or.length) return [];
      return Order.find({ $or: or }).sort({ createdAt: -1 }).lean();
    }
    const all = [...fallbackOrders.findAll(), ...inMemoryOrders];
    return all.filter((o) => String(o.user || '') === String(customerId?.id || customerId) || (customerId?.email && String(o.userEmail || o.customer?.email || '').toLowerCase() === String(customerId.email).toLowerCase()));
  },

  async getCustomerOrderById(customerCtx, id) {
    const s = String(id || '');
    const isMongoConnected = Order.db?.readyState === 1;
    let order = null;
    if (isMongoConnected) {
      order = await Order.findOne({ $or: [{ _id: s.match(/^[0-9a-fA-F]{24}$/) ? s : null }, { orderNumber: s }] }).lean();
    } else {
      order = fallbackOrders.findOne({ orderNumber: s }) || fallbackOrders.findOne({ _id: s, id: s }) || inMemoryOrders.find((o) => o.orderNumber === s || o.id === s || o._id === s) || null;
    }
    if (!order) return null;
    const ownerOk = (order.user && String(order.user) === String(customerCtx.id)) || String(order.userEmail || order.customer?.email || '').toLowerCase() === String(customerCtx.email || '').toLowerCase();
    if (!ownerOk) { const e = new Error('You do not have access to this order'); e.statusCode = 403; throw e; }
    return order;
  },
};
