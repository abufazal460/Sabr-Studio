import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Admin Mongoose Schema
 * References: DATABASE.md §2.5, §4, §5, §6; prompts/05-auth.md §6
 */
const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Valid email is required'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Excluded from all query results by default
    },
    role: {
      type: String,
      enum: ['admin'],
      default: 'admin',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
      required: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

// In-memory store for fallback / local development when MongoDB Atlas is not connected
export const inMemoryAdmins = [
  {
    _id: 'admin-1',
    id: 'admin-1',
    name: 'Studio Admin',
    email: 'admin@sabrstudio.com',
    // Pre-hashed bcrypt hash for 'admin123' (10 rounds)
    password: '$2a$10$LuUvjIDZM37R/uP02T1CF.JWHBdhC9HdSmx.KpZoYyNvMGIKx6nvu',
    role: 'admin',
    status: 'active',
    lastLoginAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
];
