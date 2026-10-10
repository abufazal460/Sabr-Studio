import mongoose from 'mongoose';

/**
 * Phone OTP challenge store. Only a SHA-256 hash of the code is persisted; the
 * raw code exists solely in the SMS delivered to the customer. Codes are
 * short-lived, single-use, and attempt-limited (enforced in customer.service).
 */
const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

otpSchema.index({ phone: 1, createdAt: -1 });
// Auto-expire stale challenge rows an hour after they lapse.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const OtpCode = mongoose.models.OtpCode || mongoose.model('OtpCode', otpSchema);

// In-memory fallback for preview / no-DB mode (mirrors the app's other stores).
export const inMemoryOtps = [];
