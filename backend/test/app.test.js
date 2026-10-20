import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import supertest from 'supertest';

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

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
const { googleIdentity } = await import('../services/google.service.js');
const request = supertest(app);

const ADMIN_LOGIN = { email: 'unit@test.local', password: 'unit-test-password-12345' };
const CUSTOMER_A_KEY = 'a';
const CUSTOMER_B_KEY = 'b';
const CUSTOMER_A = {
  name: 'Unit Customer A',
  email: 'a@test.local',
  phone: '+91 98765 43210',
};
const CUSTOMER_B = {
  name: 'Unit Customer B',
  email: 'b@test.local',
  phone: '+91 98765 43211',
};

/**
 * Customers authenticate with Google Sign-In only. In tests we replace the
 * verifier seam with a stub that returns a fixed, already-verified identity -
 * production code always performs the real RS256/JWKS verification.
 */
const GOOGLE_IDENTITIES = {
  [CUSTOMER_A_KEY]: { googleId: 'google-sub-a', email: CUSTOMER_A.email, name: CUSTOMER_A.name, avatar: '' },
  [CUSTOMER_B_KEY]: { googleId: 'google-sub-b', email: CUSTOMER_B.email, name: CUSTOMER_B.name, avatar: '' },
};

function stubGoogleIdentity(key) {
  googleIdentity.verify = async (credential) => {
    if (!credential) {
      const e = new Error('Google credential is required.');
      e.statusCode = 400;
      throw e;
    }
    const identity = GOOGLE_IDENTITIES[key];
    if (!identity || credential === 'invalid-credential') {
      const e = new Error('Google credential verification failed.');
      e.statusCode = 400;
      throw e;
    }
    return identity;
  };
}

function adminToken() {
  return request
    .post('/api/auth/login')
    .send(ADMIN_LOGIN)
    .then((res) => {
      assert.equal(res.status, 200);
      return res.headers['set-cookie'].join('; ');
    });
}

async function customerToken(key) {
  stubGoogleIdentity(key);
  const res = await request
    .post('/api/customer/google')
    .send({ credential: `valid-credential-${key}` });
  assert.equal(res.status, 200, `google login for ${key} failed`);
  const setCookie = res.headers['set-cookie'];
  return Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
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

    const cookie = await customerToken(CUSTOMER_A_KEY);
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
    const cookie = await customerToken(CUSTOMER_A_KEY);
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
    const a = await customerToken(CUSTOMER_A_KEY);
    const b = await customerToken(CUSTOMER_B_KEY);

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

// ---------------------------------------------------------------------------
// 8. Project Category Management & Project CRUD Integration
// ---------------------------------------------------------------------------
describe('project category management & persistence', () => {
  it('retrieves project categories via public and admin endpoints', async () => {
    const publicRes = await request.get('/api/projects/categories');
    assert.equal(publicRes.status, 200);
    assert.equal(publicRes.body.success, true);
    assert.ok(Array.isArray(publicRes.body.data));
    assert.ok(publicRes.body.data.includes('Residential'));
    assert.ok(publicRes.body.data.includes('Commercial'));
    assert.ok(publicRes.body.data.includes('Hospitality'));

    // Admin endpoint rejects unauthenticated
    const unauthAdmin = await request.get('/api/admin/projects/categories');
    assert.equal(unauthAdmin.status, 401);

    // Admin endpoint succeeds with cookie
    const cookie = await adminToken();
    const authAdmin = await request
      .get('/api/admin/projects/categories')
      .set('Cookie', cookie);
    assert.equal(authAdmin.status, 200);
    assert.equal(authAdmin.body.success, true);
    assert.ok(Array.isArray(authAdmin.body.data));
  });

  it('rejects unauthenticated project category creation', async () => {
    const res = await request
      .post('/api/admin/projects/categories')
      .send({ name: 'Urban Landscape' });
    assert.equal(res.status, 401);
  });

  it('validates project category name (rejects empty or excessively long names)', async () => {
    const cookie = await adminToken();

    const emptyRes = await request
      .post('/api/admin/projects/categories')
      .set('Cookie', cookie)
      .send({ name: '   ' });
    assert.equal(emptyRes.status, 400);

    const longRes = await request
      .post('/api/admin/projects/categories')
      .set('Cookie', cookie)
      .send({ name: 'A'.repeat(51) });
    assert.equal(longRes.status, 400);
  });

  it('creates custom project category and handles case-insensitive duplicates gracefully', async () => {
    const cookie = await adminToken();

    // 1. Create a custom category
    const createRes = await request
      .post('/api/admin/projects/categories')
      .set('Cookie', cookie)
      .send({ name: 'Landscape Architecture' });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.data.name, 'Landscape Architecture');

    // 2. Duplicate with different casing returns existing category without error
    const duplicateRes = await request
      .post('/api/admin/projects/categories')
      .set('Cookie', cookie)
      .send({ name: '  landscape architecture  ' });
    assert.ok(duplicateRes.status === 200 || duplicateRes.status === 201);
    assert.equal(duplicateRes.body.data.name, 'Landscape Architecture');

    // 3. New category is now in available categories list
    const listRes = await request.get('/api/projects/categories');
    assert.ok(listRes.body.data.includes('Landscape Architecture'));
  });

  it('persists custom category on project create and preserves it on edit', async () => {
    const cookie = await adminToken();

    // Create project with a custom category
    const createRes = await request
      .post('/api/admin/projects')
      .set('Cookie', cookie)
      .send({
        title: 'Boutique Heritage Villa',
        description: 'Conservation and interior design of historic estate.',
        category: 'Heritage Restoration',
        location: 'Jaipur, Rajasthan',
        year: 2024,
      });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.data.category, 'Heritage Restoration');

    const projectId = createRes.body.data._id || createRes.body.data.id;

    // Verify fetched project maintains the custom category
    const fetchRes = await request
      .get(`/api/admin/projects/${projectId}`)
      .set('Cookie', cookie);
    assert.equal(fetchRes.status, 200);
    assert.equal(fetchRes.body.data.category, 'Heritage Restoration');

    // Update project category to another category (e.g. Commercial) and ensure no fallback to Residential
    const updateRes = await request
      .put(`/api/admin/projects/${projectId}`)
      .set('Cookie', cookie)
      .send({
        category: 'Commercial',
      });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.category, 'Commercial');
    assert.equal(updateRes.body.data.title, 'Boutique Heritage Villa'); // other fields preserved
  });
});

// ---------------------------------------------------------------------------
// 9. Customer session persistence (reload / browser restart simulation)
// ---------------------------------------------------------------------------
describe('customer session persistence', () => {
  it('issues a persistent HttpOnly cookie with correct attributes on Google login', async () => {
    stubGoogleIdentity(CUSTOMER_A_KEY);
    const res = await request
      .post('/api/customer/google')
      .send({ credential: `valid-credential-${CUSTOMER_A_KEY}` });
    assert.equal(res.status, 200);
    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie, 'Set-Cookie header must be present');
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    assert.ok(cookieStr.startsWith('sabr_customer='), 'Cookie must be named sabr_customer');
    assert.ok(cookieStr.includes('HttpOnly'), 'Cookie must be HttpOnly');
    assert.ok(cookieStr.includes('Path=/'), 'Cookie path must be /');
    assert.ok(cookieStr.toLowerCase().includes('samesite=lax'), 'Cookie SameSite must be lax in dev');
    assert.ok(cookieStr.includes('Max-Age=31536000'), 'Cookie Max-Age must be 1 year (31536000s)');
    assert.ok(!cookieStr.includes('Secure'), 'Cookie must not be Secure in dev');
  });

  it('restores customer session on /customer/me after login (simulated page reload)', async () => {
    stubGoogleIdentity(CUSTOMER_A_KEY);
    const loginRes = await request
      .post('/api/customer/google')
      .send({ credential: `valid-credential-${CUSTOMER_A_KEY}` });
    assert.equal(loginRes.status, 200);
    const cookie = loginRes.headers['set-cookie'];
    const meRes = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.customer.email, CUSTOMER_A.email);
    assert.equal(meRes.body.data.customer.name, CUSTOMER_A.name);
  });

  it('keeps customer logged in across multiple requests with the same cookie', async () => {
    stubGoogleIdentity(CUSTOMER_B_KEY);
    const loginRes = await request
      .post('/api/customer/google')
      .send({ credential: `valid-credential-${CUSTOMER_B_KEY}` });
    assert.equal(loginRes.status, 200);
    const cookie = loginRes.headers['set-cookie'];
    const r1 = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(r1.status, 200);
    const r2 = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(r2.status, 200);
    assert.equal(r2.body.data.customer.email, CUSTOMER_B.email);
  });

  it('rejects /api/customer/me with no cookie (unauthenticated)', async () => {
    const res = await request.get('/api/customer/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'CUSTOMER_AUTH_REQUIRED');
  });

  it('rejects /api/customer/me with an invalid cookie token', async () => {
    const res = await request
      .get('/api/customer/me')
      .set('Cookie', 'sabr_customer=invalid.token.here');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'CUSTOMER_TOKEN_INVALID');
  });

  it('clears the persistent cookie on logout', async () => {
    stubGoogleIdentity(CUSTOMER_A_KEY);
    const loginRes = await request
      .post('/api/customer/google')
      .send({ credential: `valid-credential-${CUSTOMER_A_KEY}` });
    assert.equal(loginRes.status, 200);
    const cookie = loginRes.headers['set-cookie'];
    const meRes = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(meRes.status, 200);
    const logoutRes = await request
      .post('/api/customer/logout')
      .set('Cookie', cookie);
    assert.equal(logoutRes.status, 200);
    const clearCookie = logoutRes.headers['set-cookie'];
    assert.ok(clearCookie, 'Set-Cookie header must be present on logout');
    const clearStr = Array.isArray(clearCookie) ? clearCookie.join('; ') : clearCookie;
    assert.ok(clearStr.startsWith('sabr_customer='), 'Logout cookie must be named sabr_customer');
    assert.ok(clearStr.includes('Max-Age=0'), 'Logout cookie Max-Age must be 0');
    // After logout, a request without any cookie must be rejected
    const noCookie = await request.get('/api/customer/me');
    assert.equal(noCookie.status, 401);
    assert.equal(noCookie.body.code, 'CUSTOMER_AUTH_REQUIRED');
  });

  it('keeps admin authentication separate from customer authentication', async () => {
    const adminCookie = await adminToken();
    const adminRes = await request.get('/api/admin/orders').set('Cookie', adminCookie);
    assert.equal(adminRes.status, 200);
    const customerRes = await request.get('/api/customer/me').set('Cookie', adminCookie);
    assert.equal(customerRes.status, 401);
  });

  it('keeps customer and admin JWT lifetimes independent (1y customer, env-driven admin)', async () => {
    // Customer: default lifetime is one year, matching the cookie Max-Age.
    const custCookieStr = await customerToken(CUSTOMER_A_KEY);
    const custMatch = /sabr_customer=([^;]+)/.exec(custCookieStr);
    assert.ok(custMatch, 'customer cookie value missing');
    const custPayload = jwt.decode(decodeURIComponent(custMatch[1]));
    const custTtl = custPayload.exp - custPayload.iat;
    const year = 365 * 24 * 60 * 60;
    assert.ok(Math.abs(custTtl - year) <= 60, `customer JWT TTL ${custTtl}s should be ~1 year`);

    // Admin: still honors JWT_EXPIRES_IN (1h in this test env) — the customer
    // one-year default must not leak into admin sessions.
    const adminCookieStr = await adminToken();
    const adminMatch = /token=([^;]+)/.exec(adminCookieStr);
    assert.ok(adminMatch, 'admin cookie value missing');
    const adminPayload = jwt.decode(decodeURIComponent(adminMatch[1]));
    assert.equal(adminPayload.exp - adminPayload.iat, 3600, 'admin JWT TTL must stay JWT_EXPIRES_IN (1h in tests)');
    assert.equal(adminPayload.kind, undefined, 'admin token must not carry the customer kind claim');
  });

  it('checkout works after session restoration (cookie persists)', async () => {
    stubGoogleIdentity(CUSTOMER_A_KEY);
    const loginRes = await request
      .post('/api/customer/google')
      .send({ credential: `valid-credential-${CUSTOMER_A_KEY}` });
    assert.equal(loginRes.status, 200);
    const cookie = loginRes.headers['set-cookie'];
    const meRes = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(meRes.status, 200);
    const checkoutRes = await request
      .post('/api/orders/checkout')
      .set('Cookie', cookie)
      .send({
        address: SAMPLE_ADDRESS,
        items: [{ productId: 'prod-1', quantity: 1 }],
      });
    assert.equal(checkoutRes.status, 200);
    assert.ok(checkoutRes.body.data.orderId);
  });
});


