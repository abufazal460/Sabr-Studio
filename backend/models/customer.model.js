import mongoose from 'mongoose';

/**
 * Customer (store shopper) account — separate from Admin.
 * Google Sign-In is the ONLY identity provider: there is no password, no OTP
 * and no email/password login. The Google `sub` claim is the account key.
 * Name and phone stay editable by the customer; the email comes from the
 * server-verified Google token and is therefore immutable here.
 */
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home', trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    house: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    landmark: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Valid email is required'],
    },
    // Unique per Google account. The partial filter keeps legacy records that
    // have no googleId yet out of the unique index (a plain unique index would
    // collide on the repeated null values). Not `required` so that legacy
    // password-era records stay valid; the service rejects a missing `sub`.
    googleId: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      partialFilterExpression: { googleId: { $type: 'string' } },
    },
    emailVerified: { type: Boolean, default: true },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '', trim: true },
    addresses: { type: [addressSchema], default: [] },
    role: { type: String, enum: ['customer'], default: 'customer' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Customer =
  mongoose.models.Customer || mongoose.model('Customer', customerSchema);
