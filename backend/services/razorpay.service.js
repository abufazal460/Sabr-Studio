import crypto from 'crypto';

function getKeyId() { return process.env.RAZORPAY_KEY_ID || ''; }
function getKeySecret() { return process.env.RAZORPAY_KEY_SECRET || ''; }
export function isRazorpayConfigured() { return Boolean(getKeyId() && getKeySecret()); }

async function getClient() {
  if (!isRazorpayConfigured()) return null;
  const { default: Razorpay } = await import('razorpay');
  return new Razorpay({ key_id: getKeyId(), key_secret: getKeySecret() });
}

export async function createRazorpayOrder({ amountPaise, currency = 'INR', receipt }) {
  if (!isRazorpayConfigured()) {
    return { id: `order_mock_${Date.now()}`, amount: amountPaise, currency, receipt, mock: true };
  }
  const client = await getClient();
  const order = await client.orders.create({ amount: amountPaise, currency, receipt });
  return { ...order, mock: false };
}

export function verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const secret = getKeySecret();
  if (!secret) return { ok: false, reason: 'RAZORPAY_SECRET_MISSING' };
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return { ok: false, reason: 'MISSING_FIELDS' };
  const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  const a = Buffer.from(expected); const b = Buffer.from(String(razorpaySignature));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, reason: ok ? null : 'SIGNATURE_MISMATCH' };
}

export function verifyWebhookSignature(rawBody, signature, secretOverride) {
  const secret = secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET || getKeySecret();
  if (!secret || !signature) return false;
  const body = typeof rawBody === 'string' ? rawBody : rawBody?.toString?.() || '';
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(expected); const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const razorpayService = { isRazorpayConfigured, createRazorpayOrder, verifyCheckoutSignature, verifyWebhookSignature, getPublicKeyId: getKeyId };
