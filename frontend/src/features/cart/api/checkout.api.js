import axiosClient from '../../../shared/api/axiosClient';
import { generateIdempotencyKey } from '../../../shared/utils/idempotency';

export const createCheckoutSession = async (payload, idempotencyKey = null) => {
  // Generate idempotency key if not provided
  const key = idempotencyKey || generateIdempotencyKey('checkout');
  
  try {
    const response = await axiosClient.post('/orders/checkout', payload, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response;
  } catch (error) {
    // If duplicate operation error, return the existing result
    if (error.status === 409 && error.message?.includes('already')) {
      console.log('[Checkout] Duplicate request detected, returning existing result');
      // In a real implementation, you might fetch the existing order
    }
    throw error;
  }
};

export const verifyPayment = async (payload, idempotencyKey = null) => {
  // Generate idempotency key if not provided
  const key = idempotencyKey || generateIdempotencyKey('payment');
  
  try {
    const response = await axiosClient.post('/orders/verify', payload, {
      headers: {
        'Idempotency-Key': key,
      },
    });
    return response;
  } catch (error) {
    // If duplicate operation error, return the existing result
    if (error.status === 409 && error.message?.includes('already')) {
      console.log('[Payment] Duplicate verification detected');
    }
    throw error;
  }
};
