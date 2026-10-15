import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import supertest from 'supertest';

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Test environment isolation
// ---------------------------------------------------------------------------
// These must be set BEFORE the dynamic import of `../app.js` so dotenv (which
// loads backend/.env at import time) cannot inject a production Atlas URI.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  'test-secret-for-unit-tests-and-long-enough-to-pass-32-char-check';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_EMAIL = 'unit@test.local';
process.env.ADMIN_PASSWORD = 'unit-test-password-12345';
process.env.ADMIN_NAME = 'Unit Admin';
process.env.RAZORPAY_KEY_ID = 'key_test_mock';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.RAZORPAY_WEBHOOK_SECRET = '';
process.env.MONGODB_URI = '';
process.env.SENTRY_DSN = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';

const { default: app } = await import('../app.js');
const request = supertest(app);

const ADMIN_LOGIN = { email: 'unit@test.local', password: 'unit-test-password-12345' };
const CUSTOMER_A = {
  name: 'Unit Customer A',
  email: 'a@test.local',
  password: 'password12345',
  phone: '+91 98765 43210',
};
const CUSTOMER_B = {
  name: 'Unit Customer B',
  email: 'b@test.local',
  password: 'password12345',
  phone: '+91 98765 43211',
};

function adminToken() {
  return request
    .post('/api/auth/login')
    .send(ADMIN_LOGIN)
    .then((res) => {
      assert.equal(res.status, 200);
      return res.headers['set-cookie'].join('; ');
    });
}

async function customerToken(customer) {
  const regRes = await request
    .post('/api/customer/register')
    .send(customer);
  if (regRes.status === 201 && regRes.headers['set-cookie']) {
    return Array.isArray(regRes.headers['set-cookie'])
      ? regRes.headers['set-cookie'].join('; ')
      : regRes.headers['set-cookie'];
  }
  const loginRes = await request
    .post('/api/customer/login')
    .send({ email: customer.email, password: customer.password });
  assert.equal(loginRes.status, 200);
  return Array.isArray(loginRes.headers['set-cookie'])
    ? loginRes.headers['set-cookie'].join('; ')
    : loginRes.headers['set-cookie'];
}

const SAMPLE_ADDRESS = {
  fullName: 'Unit Customer A',
  phone: '+91 98765 43210',
  house: '123',
  street: 'Main Street',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110001',
};

// ---------------------------------------------------------------------------
// 1. Server-side price resolution
// ---------------------------------------------------------------------------
describe('server-side price resolution', () => {
  it('resolves the unit price from the catalog, not from the browser', async () => {
    const catalog = await request.get('/api/retail/komorebi-lounge-chair');
    assert.equal(catalog.status, 200);
    const unitPrice = catalog.body?.data?.[0]?.price ?? 34000;

    const cookie = await customerToken(CUSTOMER_A);
    const res = await request
      .post('/api/orders/checkout')
      .set('Cookie', cookie)
      .send({
        address: SAMPLE_ADDRESS,
        items: [
          {
            productId: 'prod-1',
            slug: 'komorebi-lounge-chair',
            quantity: 1,
            unitPrice: 1000, // deliberately wrong — must be ignored
          },
        ],
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.amount, unitPrice, 'amount must be the server-resolved price');
    assert.notEqual(res.body.data.amount, 1000, 'client-supplied price must not be trusted');
    assert.equal(res.body.data.itemsCount, 1);
  });
});

// ---------------------------------------------------------------------------
// 2. Razorpay checksum verification (unit + integration)
// ---------------------------------------------------------------------------
describe('razorpay signature verification', () => {
  it('rejects a tampered Razorpay order/payment signature', async () => {
    const { verifyCheckoutSignature } = await import('../services/razorpay.service.js');
    const secret = 'test-secret-valid';
    process.env.RAZORPAY_KEY_SECRET = secret;
    const orderId = 'order_live_123';
    const paymentId = 'pay_live_456';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const tamperedSignature = '0'.repeat(expected.length);

    const valid = verifyCheckoutSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: expected,
    });
    assert.equal(valid.ok, true);

    const invalid = verifyCheckoutSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: tamperedSignature,
    });
    assert.equal(invalid.ok, false);
    process.env.RAZORPAY_KEY_SECRET = '';
  });

  it('verifies a valid HMAC helper exists', async () => {
    const { verifyCheckoutSignature } = await import('../services/razorpay.service.js');
    assert.equal(typeof verifyCheckoutSignature, 'function');
  });
});

// ---------------------------------------------------------------------------
// 3. Idempotency
// ---------------------------------------------------------------------------
describe('idempotency', () => {
  it('returns the same order for the same Idempotency-Key (no duplicate order)', async () => {
    const cookie = await customerToken(CUSTOMER_A);
    const first = await request
      .post('/api/orders/checkout')
      .set('Cookie', cookie)
      .send({
        address: SAMPLE_ADDRESS,
        items: [{ productId: 'prod-1', quantity: 1 }],
      })
      .set('Idempotency-Key', 'idem-dup-test');
    assert.equal(first.status, 200);

    const second = await request
      .post('/api/orders/checkout')
      .set('Cookie', cookie)
      .send({
        address: SAMPLE_ADDRESS,
        items: [{ productId: 'prod-1', quantity: 1 }],
      })
      .set('Idempotency-Key', 'idem-dup-test');
    assert.equal(second.status, 200);
    assert.equal(second.body.data.orderId, first.body.data.orderId);
    assert.equal(second.body.data.amount, first.body.data.amount);
  });
});


// ---------------------------------------------------------------------------
// 4. Admin-auth 401 checks
// ---------------------------------------------------------------------------
describe('admin route auth', () => {
  it('rejects unauthenticated requests to admin routes with 401', async () => {
    const res = await request.get('/api/admin/orders');
    assert.equal(res.status, 401);
  });

  it('allows an authenticated admin token on admin routes', async () => {
    const cookie = await adminToken();
    const res = await request.get('/api/admin/orders').set('Cookie', cookie);
    assert.equal(res.status, 200);
  });
});

// ---------------------------------------------------------------------------
// 5. Customer ownership of orders
// ---------------------------------------------------------------------------
describe('customer order ownership', () => {
  it('prevents a customer reading another customer\'s order', async () => {
    const a = await customerToken(CUSTOMER_A);
    const b = await customerToken(CUSTOMER_B);

    const orderA = await request
      .post('/api/orders/checkout')
      .set('Cookie', a)
      .send({
        address: SAMPLE_ADDRESS,
        items: [{ productId: 'prod-1', quantity: 1 }],
      });
    assert.equal(orderA.status, 200);
    const aOrderId = orderA.body.data.orderId;

    const target = await request.get(`/api/orders/my/${aOrderId}`).set('Cookie', b);
    assert.equal(target.status, 403);
  });
});

// ---------------------------------------------------------------------------
// 6. Mass-assignment rejection
// ---------------------------------------------------------------------------
describe('mass-assignment rejection', () => {
  it('rejects paymentStatus/amount updates on admin order status routes', async () => {
    const cookie = await adminToken();
    const res = await request
      .patch('/api/admin/orders/unsettable/status')
      .set('Cookie', cookie)
      .send({
        orderStatus: 'confirmed',
        paymentStatus: 'paid',
        amount: 0,
      });
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------------
// 7. Upload validation (multer is the wired integration)
// ---------------------------------------------------------------------------
describe('upload validation', () => {
  it('rejects an unauthenticated admin upload with 401', async () => {
    const res = await request.post('/api/admin/uploads').attach('file', Buffer.from([0x4a, 0x43, 0x00]), 'evil.exe');
    assert.equal(res.status, 401);
  });

  it('rejects a renamed executable by content inspection with 415', async () => {
    const cookie = await adminToken();
    const res = await request
      .post('/api/admin/uploads')
      .set('Cookie', cookie)
      .attach('file', Buffer.from([0x4a, 0x43, 0x00]), 'shell.exe');
    assert.equal(res.status, 415);
  });
});

