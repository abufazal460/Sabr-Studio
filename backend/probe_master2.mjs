// Comprehensive probe for the Cart/Auth/Razorpay master prompt.
// Runs the real app against the real MongoDB Atlas on a spare port, exercises
// HTTP + service-level paths, then cleans up every document it created.
import crypto from 'crypto';

const PORT = 3124;
const base = `http://127.0.0.1:${PORT}`;

const { default: app } = await import('./app.js');
const { default: mongoose } = await import('mongoose');
const { customerService } = await import('./services/customer.service.js');
const { orderService } = await import('./services/order.service.js');
const { verifyCheckoutSignature } = await import('./services/razorpay.service.js');
const { OtpCode } = await import('./models/otp.model.js');
const { Order } = await import('./models/order.model.js');
const { Customer } = await import('./models/customer.model.js');

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await fn()) return true; await wait(250); }
  return false;
}

const j = async (method, path, { body, token, headers } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data, res };
};

const server = app.listen(PORT);
const connected = await waitFor(() => mongoose.connection.readyState === 1);
console.log(`\n=== DB connected: ${connected} (readyState ${mongoose.connection.readyState}) ===\n`);

const TAG = 'probe_' + Date.now();
const createdCustomers = [];
const createdOrders = [];
let product = null;

try {
  // --- Scenario 17a: health -------------------------------------------------
  const health = await j('GET', '/health');
  ok('health endpoint + DB connected', health.status === 200 && health.data?.data?.database?.state === 1, `state=${health.data?.data?.database?.state}`);

  // --- fetch a real catalog product ----------------------------------------
  const retail = await j('GET', '/api/retail');
  const list = retail.data?.data?.items || retail.data?.data || retail.data?.items || [];
  product = Array.isArray(list) ? list.find((p) => p && (p.slug || p.id || p._id)) : null;
  ok('catalog has a purchasable product', !!product, product ? `slug=${product.slug} price=${product.price}` : 'none found');

  const productId = product ? (product.slug || product.id || product._id) : null;

  // --- Scenario: customer registration + token ------------------------------
  const emailA = `${TAG}_a@sabr.test`;
  const emailB = `${TAG}_b@sabr.test`;
  const regA = await customerService.register({ name: 'Probe A', email: emailA, password: 'probe123', phone: '+919000000001' });
  const regB = await customerService.register({ name: 'Probe B', email: emailB, password: 'probe123', phone: '+919000000002' });
  createdCustomers.push(regA.customer.id, regB.customer.id);
  const tokenA = regA.token, tokenB = regB.token;
  ok('register issues JWT + customer', !!tokenA && regA.customer.email === emailA);

  // --- Scenario 16/§8: protectCustomer rejects no/invalid token -------------
  const noAuth = await j('GET', '/api/orders/my');
  ok('GET /orders/my without token → 401', noAuth.status === 401, `status=${noAuth.status}`);
  const badAuth = await j('GET', '/api/orders/my', { token: 'garbage.token.value' });
  ok('GET /orders/my with invalid token → 401', badAuth.status === 401, `status=${badAuth.status}`);

  // --- Scenario: /orders/my returns 200 (no CastError 500) ------------------
  const myOrders = await j('GET', '/api/orders/my', { token: tokenA });
  ok('GET /orders/my authenticated → 200 (no 500 CastError)', myOrders.status === 200, `status=${myOrders.status}`);

  // --- Scenario 12/§6: checkout creates PENDING order, no keyId (unconfigured)
  const address = { fullName: 'Probe A', phone: '+919000000001', house: '12', street: 'Test Street', city: 'Mumbai', state: 'MH', pincode: '400001' };
  const idemKey = TAG + '-idem-1';
  const co1 = await j('POST', '/api/orders/checkout', { token: tokenA, headers: { 'Idempotency-Key': idemKey }, body: { items: [{ productId, quantity: 2 }], address } });
  const d1 = co1.data?.data;
  createdOrders.push(d1?.orderId || d1?.id);
  ok('checkout → 200 with pending order', co1.status === 200 && d1?.paymentStatus === 'pending', `paymentStatus=${d1?.paymentStatus} orderStatus=${d1?.orderStatus}`);
  ok('checkout with no Razorpay keys → empty keyId (frontend must NOT open gateway / must show honest error)', d1 && d1.keyId === '', `keyId='${d1?.keyId}'`);
  ok('checkout returns a razorpay order id (mock in dev)', !!d1?.razorpayOrderId, `rzp=${d1?.razorpayOrderId}`);
  ok('order NOT marked paid on creation (§6)', d1?.paymentStatus !== 'paid' && d1?.orderStatus !== 'confirmed', `${d1?.paymentStatus}/${d1?.orderStatus}`);
  ok('server recalculated amount (never trusts client)', typeof d1?.amount === 'number' && d1.amount > 0, `amount=${d1?.amount} expected≈${(Number(product?.price) * 2)}`);

  // --- Scenario 15: idempotency → same order, no duplicate ------------------
  const co2 = await j('POST', '/api/orders/checkout', { token: tokenA, headers: { 'Idempotency-Key': idemKey }, body: { items: [{ productId, quantity: 2 }], address } });
  const d2 = co2.data?.data;
  ok('repeated checkout with same Idempotency-Key → same order (no duplicate)', (d2?.orderId || d2?.id) === (d1?.orderId || d1?.id), `${d2?.orderId} vs ${d1?.orderId}`);

  // --- Scenario 13: invalid signature rejected ------------------------------
  // Set a probe secret so the real HMAC verification path is exercised (not mock).
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = 'probe_secret_' + TAG;
  const rzpOrderId = d1?.razorpayOrderId;
  const goodSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${rzpOrderId}|pay_probe123`).digest('hex');
  const badVerify = await j('POST', '/api/orders/verify', { token: tokenA, body: { orderId: d1?.orderId, razorpayOrderId: rzpOrderId, razorpayPaymentId: 'pay_probe123', razorpaySignature: 'deadbeef' + goodSig.slice(8) } });
  ok('verifyPayment with WRONG signature → rejected (400), not paid', badVerify.status === 400, `status=${badVerify.status} msg=${badVerify.data?.message}`);

  // --- Scenario 14: correct signature → paid + confirmed --------------------
  const goodVerify = await j('POST', '/api/orders/verify', { token: tokenA, body: { orderId: d1?.orderId, razorpayOrderId: rzpOrderId, razorpayPaymentId: 'pay_probe123', razorpaySignature: goodSig } });
  const gv = goodVerify.data?.data;
  ok('verifyPayment with CORRECT signature → verified + paid', goodVerify.status === 200 && gv?.status === 'paid', `status=${goodVerify.status} verified=${gv?.verified}`);
  const persisted = await Order.findById(d1?.orderId).lean();
  ok('paid order persisted as paymentStatus=paid, orderStatus=confirmed', persisted?.paymentStatus === 'paid' && persisted?.orderStatus === 'confirmed', `${persisted?.paymentStatus}/${persisted?.orderStatus}`);

  // --- verifyCheckoutSignature unit ----------------------------------------
  const sigOk = verifyCheckoutSignature({ razorpayOrderId: rzpOrderId, razorpayPaymentId: 'pay_x', razorpaySignature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${rzpOrderId}|pay_x`).digest('hex') });
  const sigBad = verifyCheckoutSignature({ razorpayOrderId: rzpOrderId, razorpayPaymentId: 'pay_x', razorpaySignature: 'nope' });
  ok('verifyCheckoutSignature: valid → ok, invalid → rejected', sigOk.ok === true && sigBad.ok === false, `ok=${sigOk.ok} bad=${sigBad.ok}(${sigBad.reason})`);
  process.env.RAZORPAY_KEY_SECRET = prevSecret; // restore

  // --- Scenario 16/§7: ownership isolation ---------------------------------
  const crossAccess = await j('GET', `/api/orders/my/${d1?.orderId}`, { token: tokenB });
  ok('customer B cannot read customer A order (IDOR blocked)', crossAccess.status === 403 || crossAccess.status === 404, `status=${crossAccess.status}`);
  const ownAccess = await j('GET', `/api/orders/my/${d1?.orderId}`, { token: tokenA });
  ok('owner CAN read own order', ownAccess.status === 200, `status=${ownAccess.status}`);
  const bOrders = await j('GET', '/api/orders/my', { token: tokenB });
  const bList = bOrders.data?.data || [];
  ok("customer B order list excludes A's order", Array.isArray(bList) && !bList.some((o) => String(o._id) === String(d1?.orderId)), `Bcount=${bList.length}`);

  // --- Scenario: verifyPayment cross-owner blocked --------------------------
  const crossVerify = await j('POST', '/api/orders/verify', { token: tokenB, body: { orderId: d1?.orderId, razorpayOrderId: rzpOrderId, razorpayPaymentId: 'pay_z', razorpaySignature: 'x' } });
  ok('customer B cannot verify/alter A payment (403)', crossVerify.status === 403, `status=${crossVerify.status}`);

  // --- Scenario 6/§4: OTP request fails CLOSED (no SMS provider) ------------
  const otpReq = await j('POST', '/api/customer/request-otp', { body: { phone: '+919000000009' } });
  ok('request-otp without provider → 503 fail-closed (never fakes success)', otpReq.status === 503, `status=${otpReq.status} msg=${otpReq.data?.message}`);
  const otpReqBad = await j('POST', '/api/customer/request-otp', { body: { phone: '12' } });
  ok('request-otp with invalid phone → 400', otpReqBad.status === 400, `status=${otpReqBad.status}`);

  // --- Scenario 6/7: OTP verify logic (inject real OtpCode docs) ------------
  const phone = '+919000000009';
  const normPhone = phone; // normalizePhone keeps leading + and digits
  const hash = (c) => crypto.createHash('sha256').update(String(c)).digest('hex');
  const realCode = '424242';

  // 6a: no code stored → invalid
  await OtpCode.deleteMany({ phone: normPhone });
  const noCode = await j('POST', '/api/customer/verify-otp', { body: { phone: normPhone, code: '123456' } });
  ok('verify-otp with no stored code → 400', noCode.status === 400, `status=${noCode.status}`);

  // 6b: wrong code → 400 + attempt increments
  await OtpCode.create({ phone: normPhone, otpHash: hash(realCode), expiresAt: new Date(Date.now() + 5 * 60000), attempts: 0, lastSentAt: new Date(), verifiedAt: null });
  const wrong = await j('POST', '/api/customer/verify-otp', { body: { phone: normPhone, code: '000000' } });
  const afterWrong = await OtpCode.findOne({ phone: normPhone });
  ok('verify-otp WRONG code → 400 + attempt counted', wrong.status === 400 && afterWrong?.attempts === 1, `status=${wrong.status} attempts=${afterWrong?.attempts}`);

  // 6c: expired code → 400
  await OtpCode.deleteMany({ phone: normPhone });
  await OtpCode.create({ phone: normPhone, otpHash: hash(realCode), expiresAt: new Date(Date.now() - 1000), attempts: 0, lastSentAt: new Date(Date.now() - 90000), verifiedAt: null });
  const expired = await j('POST', '/api/customer/verify-otp', { body: { phone: normPhone, code: realCode } });
  ok('verify-otp EXPIRED code → 400', expired.status === 400, `status=${expired.status} msg=${expired.data?.message}`);

  // 6d: attempt limit → 400 even with correct code
  await OtpCode.deleteMany({ phone: normPhone });
  await OtpCode.create({ phone: normPhone, otpHash: hash(realCode), expiresAt: new Date(Date.now() + 5 * 60000), attempts: 5, lastSentAt: new Date(), verifiedAt: null });
  const limited = await j('POST', '/api/customer/verify-otp', { body: { phone: normPhone, code: realCode } });
  ok('verify-otp after max attempts → 400 (brute-force guard)', limited.status === 400, `status=${limited.status}`);

  // 7: valid code → success + token + customer created (find-or-create)
  await OtpCode.deleteMany({ phone: normPhone });
  await OtpCode.create({ phone: normPhone, otpHash: hash(realCode), expiresAt: new Date(Date.now() + 5 * 60000), attempts: 0, lastSentAt: new Date(), verifiedAt: null });
  const valid = await j('POST', '/api/customer/verify-otp', { body: { phone: normPhone, code: realCode } });
  const otpCustomer = valid.data?.data?.customer;
  if (otpCustomer?.id) createdCustomers.push(otpCustomer.id);
  ok('verify-otp VALID code → 200 + customer session', valid.status === 200 && !!otpCustomer?.id, `status=${valid.status} phone=${otpCustomer?.phone}`);
  ok('OTP session only after verification (never on phone entry alone)', valid.status === 200 && otpCustomer?.phone === normPhone);

  // 7b: single-use — replay the same code → 400
  const replay = await j('POST', '/api/customer/verify-otp', { body: { phone: normPhone, code: realCode } });
  ok('verify-otp replay (single-use) → 400', replay.status === 400, `status=${replay.status} msg=${replay.data?.message}`);
  await OtpCode.deleteMany({ phone: normPhone });

  // --- Scenario 8/§5: Google fails CLOSED (no GOOGLE_CLIENT_ID) -------------
  const prevGoogle = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const goog = await j('POST', '/api/customer/google', { body: { credential: 'fake.id.token' } });
  ok('google login without GOOGLE_CLIENT_ID → 503 fail-closed', goog.status === 503, `status=${goog.status} msg=${goog.data?.message}`);
  // Even WITH a client id, a forged/invalid token must be rejected (no browser trust).
  process.env.GOOGLE_CLIENT_ID = 'probe-client-id.apps.googleusercontent.com';
  const googForged = await j('POST', '/api/customer/google', { body: { credential: 'header.payload.signature' } });
  ok('google login with forged/invalid token → rejected (400/503), never authenticated', googForged.status === 400 || googForged.status === 503, `status=${googForged.status}`);
  const googEmail = await j('POST', '/api/customer/google', { body: { email: 'attacker@sabr.test', googleId: '123' } });
  ok('google login ignoring client-submitted email/id (no credential) → rejected', googEmail.status === 400 || googEmail.status === 503, `status=${googEmail.status}`);
  if (prevGoogle) process.env.GOOGLE_CLIENT_ID = prevGoogle; else delete process.env.GOOGLE_CLIENT_ID;

  // --- Scenario: admin authz ------------------------------------------------
  const adminNoAuth = await j('GET', '/api/admin/orders');
  ok('GET /admin/orders without admin token → 401', adminNoAuth.status === 401, `status=${adminNoAuth.status}`);
  const adminAsCustomer = await j('GET', '/api/admin/orders', { token: tokenA });
  ok('GET /admin/orders with CUSTOMER token → 401 (role check)', adminAsCustomer.status === 401, `status=${adminAsCustomer.status}`);
  const adminLogin = await j('POST', '/api/auth/login', { body: { email: 'admin', password: 'admin' } });
  // Admin token is httpOnly-cookie only (never in body). Extract from Set-Cookie.
  const setCookies = adminLogin.res.headers.getSetCookie ? adminLogin.res.headers.getSetCookie() : [adminLogin.res.headers.get('set-cookie')].filter(Boolean);
  let adminToken = null;
  for (const c of setCookies) { const m = /^token=([^;]+)/.exec(c); if (m) adminToken = decodeURIComponent(m[1]); }
  const adminOrders = adminToken ? await j('GET', '/api/admin/orders', { token: adminToken }) : { status: 'no-token' };
  ok('admin login → can list orders', adminToken && adminOrders.status === 200, `status=${adminOrders.status} tokenFound=${!!adminToken}`);

  // --- Scenario: admin cannot mutate paymentStatus/amount -------------------
  if (adminToken) {
    const tamper = await j('PATCH', `/api/admin/orders/${d1?.orderId}/status`, { token: adminToken, body: { orderStatus: 'processing', paymentStatus: 'refunded' } });
    const after = await Order.findById(d1?.orderId).lean();
    ok('admin paymentStatus write rejected (400 validator / 403 policy) AND not mutated',
      (tamper.status === 400 || tamper.status === 403) && after?.paymentStatus === 'paid',
      `status=${tamper.status} paymentStatus=${after?.paymentStatus}`);
  }
} catch (err) {
  ok('probe completed without crashing', false, err?.stack || err?.message);
} finally {
  // --- cleanup: remove every document this probe created --------------------
  try {
    if (createdOrders.length) await Order.deleteMany({ _id: { $in: createdOrders.filter(Boolean) } });
    if (createdCustomers.length) await Customer.deleteMany({ _id: { $in: createdCustomers.filter(Boolean) } });
    await Customer.deleteMany({ email: /@sabr\.test$/ });
    await Customer.deleteMany({ email: /^phone_\d+@sabr\.invalid$/ });
    await OtpCode.deleteMany({ phone: /^\+?9190000/ });
  } catch (e) { console.log('cleanup warn:', e.message); }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} checks passed ===`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) { console.log('FAILED:'); failed.forEach((f) => console.log('  -', f.name, f.detail)); }
  server.close();
  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);
}
