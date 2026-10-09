import axiosClient from '../../../shared/api/axiosClient';
import { generateIdempotencyKey } from '../../../shared/utils/idempotency';

export const createCheckoutSession = async (payload, idempotencyKey = null) => {
  const key = idempotencyKey || generateIdempotencyKey('checkout');
  try {
    const response = await axiosClient.post('/orders/checkout', payload, {
      headers: { 'Idempotency-Key': key },
    });
    return { ...response, idempotencyKey: key };
  } catch (error) {
    if (error.status === 409 && error.message?.includes('already')) {
      console.log('[Checkout] Duplicate request detected, returning existing result');
    }
    throw error;
  }
};

export const verifyPayment = async (payload, idempotencyKey = null) => {
  const key = idempotencyKey || generateIdempotencyKey('payment');
  try {
    const response = await axiosClient.post('/orders/verify', payload, {
      headers: { 'Idempotency-Key': key },
    });
    return response;
  } catch (error) {
    if (error.status === 409 && error.message?.includes('already')) {
      console.log('[Payment] Duplicate verification detected');
    }
    throw error;
  }
};

export const getMyOrders = () => axiosClient.get('/orders/my');
export const getMyOrder = (id) => axiosClient.get(`/orders/my/${encodeURIComponent(id)}`);

export const loadRazorpayScript = () => new Promise((resolve, reject) => {
  if (typeof window === 'undefined') return reject(new Error('Checkout unavailable'));
  if (window.Razorpay) return resolve(true);
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.async = true;
  s.onload = () => resolve(true);
  s.onerror = () => reject(new Error('Failed to load Razorpay checkout. Check connection and retry.'));
  document.body.appendChild(s);
});

export function openRazorpayCheckout({ keyId, amountPaise, currency, orderId, customer, onSuccess, onDismiss }) {
  const rzp = new window.Razorpay({
    key: keyId,
    amount: amountPaise,
    currency: currency || 'INR',
    name: 'Sabr Studio',
    description: 'Studio editions & objects',
    order_id: orderId,
    prefill: { name: customer?.name || '', email: customer?.email || '', contact: customer?.phone || '' },
    theme: { color: '#111111' },
    handler(response) { onSuccess?.(response); },
    modal: { ondismiss: () => onDismiss?.() },
  });
  rzp.on('payment.failed', (resp) => onDismiss?.(resp?.error || { code: 'PAYMENT_FAILED' }));
  rzp.open();
}

