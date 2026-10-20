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

// ---------------------------------------------------------------------------
// 10. Single-address enforcement (frontend + API)
// ---------------------------------------------------------------------------
describe('single address per customer', () => {
  it('creates the first address and the list contains exactly one', async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);
    const res = await request
      .post('/api/customer/addresses')
      .set('Cookie', cookie)
      .send(SAMPLE_ADDRESS);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id || res.body.data._id, 'created address must have an id');
    assert.equal(res.body.addresses.length, 1, 'response must expose exactly one address');
    assert.equal(res.body.data.isDefault, true, 'the single address is always the default');

    const list = await request.get('/api/customer/addresses').set('Cookie', cookie);
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1, 'list must contain exactly one address');
  });

  it('rejects a second address when the API is called directly (409)', async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);
    const res = await request
      .post('/api/customer/addresses')
      .set('Cookie', cookie)
      .send({ ...SAMPLE_ADDRESS, house: '99', street: 'Different Street' });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ADDRESS_ALREADY_EXISTS');

    const list = await request.get('/api/customer/addresses').set('Cookie', cookie);
    assert.equal(list.body.data.length, 1, 'a blocked create must not add a record');
    assert.notEqual(list.body.data[0].house, '99', 'the saved address must be unchanged');
  });

  it('handles concurrent duplicate submissions safely (exactly one address)', async () => {
    const cookie = await customerToken(CUSTOMER_B_KEY);
    const [r1, r2] = await Promise.all([
      request.post('/api/customer/addresses').set('Cookie', cookie).send(SAMPLE_ADDRESS),
      request.post('/api/customer/addresses').set('Cookie', cookie).send(SAMPLE_ADDRESS),
    ]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [201, 409], `expected one 201 and one 409, got ${statuses}`);

    const list = await request.get('/api/customer/addresses').set('Cookie', cookie);
    assert.equal(list.body.data.length, 1, 'concurrent duplicates must not create two addresses');
  });

  it('updates the existing address in place without creating another record', async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);
    const before = await request.get('/api/customer/addresses').set('Cookie', cookie);
    const id = before.body.data[0].id;

    const res = await request
      .put(`/api/customer/addresses/${id}`)
      .set('Cookie', cookie)
      .send({ ...SAMPLE_ADDRESS, street: 'Updated Street Lane', house: 'Updated 7' });
    assert.equal(res.status, 200);
    assert.equal(String(res.body.data.id), String(id), 'edit must keep the same address id');

    const after = await request.get('/api/customer/addresses').set('Cookie', cookie);
    assert.equal(after.body.data.length, 1, 'editing must never create a second address');
    assert.equal(after.body.data[0].street, 'Updated Street Lane');
  });

  it('returns 404 when editing an address id that does not exist', async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);
    const res = await request
      .put('/api/customer/addresses/addr-does-not-exist')
      .set('Cookie', cookie)
      .send(SAMPLE_ADDRESS);
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'ADDRESS_NOT_FOUND');

    const list = await request.get('/api/customer/addresses').set('Cookie', cookie);
    assert.equal(list.body.data.length, 1, 'a failed edit must not change the list');
  });

  it('refuses to delete the saved address through the API (403)', async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);
    const before = await request.get('/api/customer/addresses').set('Cookie', cookie);
    const id = before.body.data[0].id;

    const res = await request.delete(`/api/customer/addresses/${id}`).set('Cookie', cookie);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ADDRESS_DELETE_NOT_ALLOWED');

    const after = await request.get('/api/customer/addresses').set('Cookie', cookie);
    assert.equal(after.body.data.length, 1, 'the address must survive a delete attempt');
    assert.equal(after.body.data[0].id, id);
  });

  it('preserves the same address across logout/login (another "device" session)', async () => {
    const first = await customerToken(CUSTOMER_A_KEY);
    const before = await request.get('/api/customer/addresses').set('Cookie', first);

    // Fresh login = new session cookie, same Google identity.
    const second = await customerToken(CUSTOMER_A_KEY);
    const after = await request.get('/api/customer/addresses').set('Cookie', second);
    assert.equal(after.body.data.length, 1);
    assert.equal(after.body.data[0].id, before.body.data[0].id, 'address id must be stable');
    assert.equal(after.body.data[0].street, before.body.data[0].street);
  });
});

// ---------------------------------------------------------------------------
// 11. Profile editing (immutable email) & secure account deletion
// ---------------------------------------------------------------------------
describe('profile editing & account deletion', () => {
  it('updates name and phone but rejects any email change', async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);

    const rejected = await request
      .put('/api/customer/profile')
      .set('Cookie', cookie)
      .send({ name: 'Name Swap', email: 'attacker@evil.example' });
    assert.equal(rejected.status, 400);
    assert.equal(rejected.body.code, 'FIELD_NOT_EDITABLE');

    const ok = await request
      .put('/api/customer/profile')
      .set('Cookie', cookie)
      .send({ name: 'Updated Customer Name', phone: '+911234567890' });
    assert.equal(ok.status, 200);

    const me = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.customer.name, 'Updated Customer Name');
    assert.equal(me.body.data.customer.phone, '+911234567890');
    assert.equal(me.body.data.customer.email, CUSTOMER_A.email, 'email must remain unchanged');
  });

  it('requires an authenticated session to delete an account', async () => {
    const res = await request.delete('/api/customer/account');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'CUSTOMER_AUTH_REQUIRED');
  });

  it("deletes the customer's own account, clears the cookie, and kills the session", async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);
    const before = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(before.status, 200);
    const oldId = before.body.data.customer.id;

    const res = await request.delete('/api/customer/account').set('Cookie', cookie);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const cleared = res.headers['set-cookie'];
    const clearStr = Array.isArray(cleared) ? cleared.join('; ') : String(cleared);
    assert.ok(clearStr.startsWith('sabr_customer='), 'deletion must clear the session cookie');
    assert.ok(clearStr.includes('Max-Age=0'), 'the cleared cookie must expire immediately');

    // The OLD session token must be rejected even if a browser kept it.
    const stale = await request.get('/api/customer/me').set('Cookie', cookie);
    assert.equal(stale.status, 401);

    // The same Google identity can sign in again and gets a FRESH account
    // (no address, different id) — the deleted one is never resurrected.
    const newCookie = await customerToken(CUSTOMER_A_KEY);
    const fresh = await request.get('/api/customer/me').set('Cookie', newCookie);
    assert.equal(fresh.status, 200);
    assert.notEqual(fresh.body.data.customer.id, oldId, 're-login must create a new account');
    const freshAddr = await request.get('/api/customer/addresses').set('Cookie', newCookie);
    assert.equal(freshAddr.body.data.length, 0, 'the new account starts without an address');
  });

  it('never lets one customer delete another (deletion is keyed to the session)', async () => {
    // Customer B (still active with an address) deletes only THEMSELVES…
    const bCookie = await customerToken(CUSTOMER_B_KEY);
    const bMe = await request.get('/api/customer/me').set('Cookie', bCookie);
    const bId = bMe.body.data.customer.id;
    const res = await request.delete('/api/customer/account').set('Cookie', bCookie);
    assert.equal(res.status, 200);

    const bStale = await request.get('/api/customer/me').set('Cookie', bCookie);
    assert.equal(bStale.status, 401, "B's own session must be dead");

    // …while customer A (fresh account from the previous test) is untouched.
    const aCookie = await customerToken(CUSTOMER_A_KEY);
    const aMe = await request.get('/api/customer/me').set('Cookie', aCookie);
    assert.equal(aMe.status, 200, "another customer must survive B's deletion");
    assert.notEqual(aMe.body.data.customer.id, bId);
  });

  it('rejects a second address for the re-created account too (rule persists)', async () => {
    const cookie = await customerToken(CUSTOMER_A_KEY);
    const first = await request.post('/api/customer/addresses').set('Cookie', cookie).send(SAMPLE_ADDRESS);
    assert.equal(first.status, 201);
    const second = await request.post('/api/customer/addresses').set('Cookie', cookie).send(SAMPLE_ADDRESS);
    assert.equal(second.status, 409);
    const list = await request.get('/api/customer/addresses').set('Cookie', cookie);
    assert.equal(list.body.data.length, 1);
  });
});


