import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * Customer (store shopper) account — separate from Admin.
 * Email/password + optional Google identity. Phone + addresses saved to profile.
 * Phone alone is NEVER proof of identity (JWT required for all order writes).
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
    password: { type: String, select: false, default: null },
    googleId: { type: String, default: null, index: true, sparse: true },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '', trim: true },
    addresses: { type: [addressSchema], default: [] },
    role: { type: String, enum: ['customer'], default: 'customer' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

customerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

customerSchema.methods.comparePassword = async function (candidate) {
  if (!this.password || !candidate) return false;
  return bcrypt.compare(candidate, this.password);
};

export const Customer =
  mongoose.models.Customer || mongoose.model('Customer', customerSchema);
