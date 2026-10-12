import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, inMemoryAdmins } from '../models/admin.model.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  // Fail-closed: never sign/verify admin sessions with a public fallback in
  // production — the dev literal lives in the (public) repo, so using it would
  // let anyone forge admin tokens.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not configured');
  }
  return 'sabr_studio_dev_jwt_secret_key_8f7b2c9d1e4a5f6e';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '24h';
}

/**
 * Service to handle admin authentication operations
 * References: Master Context §6.2, 05-auth.md §4, §7, §8; ARCHITECTURE.md §10
 */
class AuthService {
  /**
   * Generates a signed JWT with admin ID and role only (no PII)
   * @param {Object} admin 
   * @returns {string} Signed JWT
   */
  generateToken(admin) {
    const adminId = admin._id ? admin._id.toString() : admin.id;
    const payload = {
      id: adminId,
      role: admin.role || 'admin',
    };

    return jwt.sign(payload, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });
  }

  /**
   * Verifies and decodes a JWT token
   * @param {string} token 
   * @returns {Object} Decoded payload
   */
  verifyToken(token) {
    return jwt.verify(token, getJwtSecret());
  }

  /**
   * Authenticates admin by email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{ admin: Object, token: string } | null>}
   */
  async loginAdmin(email, password) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const isProd = process.env.NODE_ENV === 'production';
    let admin = null;
    let passwordHash = null;

    // 1. Try Mongoose if connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        admin = await Admin.findOne({ email: normalizedEmail }).select('+password');
        if (admin) {
          passwordHash = admin.password;
        }
      } catch (err) {
        console.error('[AuthService] Database error during lookup:', err.message);
      }
    }

    // 2. Fall back to in-memory store — NON-PRODUCTION ONLY. The in-memory
    // accounts ship in this public repo with a known bcrypt hash ('admin'), so
    // honoring them in production would be a default-credential backdoor (§8).
    if (!admin && !isProd) {
      const memAdmin = inMemoryAdmins.find(
        (a) =>
          a.email.toLowerCase() === normalizedEmail ||
          (normalizedEmail === 'admin' && a.email.startsWith('admin')) ||
          (normalizedEmail.startsWith('admin@') && a.email === 'admin')
      );
      if (memAdmin) {
        admin = memAdmin;
        passwordHash = memAdmin.password;
      }
    }

    // 3. Production first-run bootstrap. The live Atlas cluster has no admin
    // document yet, so without this the operator would be locked out. We create
    // a REAL hashed admin only when (a) we're in production, (b) Mongo is
    // connected, (c) the admins collection is empty, and (d) the caller
    // presents the operator-set ADMIN_PASSWORD (an env secret, never a
    // hardcoded default). The created admin's password is the bcrypt hash of
    // ADMIN_PASSWORD, so later logins match naturally without any literal
    // password comparison.
    if (!admin && isProd && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      const bootstrapEmail = (process.env.ADMIN_EMAIL || normalizedEmail || '').toLowerCase().trim();
      const looksLikeEmail = /^\S+@\S+\.\S+$/.test(bootstrapEmail);
      if (looksLikeEmail && mongoose.connection && mongoose.connection.readyState === 1) {
        try {
          const existing = await Admin.countDocuments({});
          if (existing === 0) {
            admin = await Admin.create({
              name: process.env.ADMIN_NAME || 'Sabr Admin',
              email: bootstrapEmail,
              password, // hashed by the schema's pre-save hook
              role: 'admin',
              status: 'active',
            });
            passwordHash = admin.password;
          }
        } catch (err) {
          console.error('[AuthService] Bootstrap admin creation failed:', err.message);
          admin = null;
          passwordHash = null;
        }
      }
    }

    // If no admin found, fail with null (controller will send generic 401)
    if (!admin || !passwordHash) {
      // Execute a dummy bcrypt compare to prevent timing side-channels
      await bcrypt.compare(password, '$2a$10$LuUvjIDZM37R/uP02T1CF.JWHBdhC9HdSmx.KpZoYyNvMGIKx6nvu');
      return null;
    }

    // Check password using bcrypt against the stored hash.
    let isMatch = await bcrypt.compare(password, passwordHash);
    // Operator-set ADMIN_PASSWORD as a literal match is a NON-PRODUCTION
    // convenience only. Hardcoded literal passwords were removed: they are a
    // backdoor, and this repo is public — anyone could read them and log in as
    // admin (§8, §14). In production the only path is a real bcrypt hash.
    if (!isMatch && !isProd && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      isMatch = true;
    }
    if (!isMatch) {
      return null;
    }

    // Check if account is disabled (403 condition)
    if (admin.status === 'disabled') {
      const error = new Error('Account is disabled');
      error.statusCode = 403;
      throw error;
    }

    // Update lastLoginAt
    const now = new Date();
    if (typeof admin.save === 'function') {
      admin.lastLoginAt = now;
      await admin.save();
    } else {
      admin.lastLoginAt = now;
    }

    const adminId = admin._id ? admin._id.toString() : admin.id;
    const token = this.generateToken(admin);

    // Return sanitized admin identity (never password hash)
    const sanitizedAdmin = {
      id: adminId,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
    };

    return {
      admin: sanitizedAdmin,
      token,
    };
  }

  /**
   * Finds an admin by ID
   * @param {string} id 
   * @returns {Promise<Object | null>}
   */
  async getAdminById(id) {
    if (!id) return null;

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const admin = await Admin.findById(id);
        if (admin) {
          const adminId = admin._id.toString();
          return {
            id: adminId,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            status: admin.status,
            lastLoginAt: admin.lastLoginAt,
          };
        }
      } catch (err) {
        console.error('[AuthService] Database error during getById:', err.message);
      }
    }

    // In-memory accounts are a NON-PRODUCTION convenience only. In production
    // the token's id must resolve to a real Mongo admin document (created by
    // the first-run bootstrap), so a forged/legacy id can never pass protect.
    if (process.env.NODE_ENV !== 'production') {
      const memAdmin = inMemoryAdmins.find(
        (a) => a.id === id || (a._id && a._id.toString() === id)
      );
      if (memAdmin) {
        return {
          id: memAdmin.id || memAdmin._id,
          name: memAdmin.name,
          email: memAdmin.email,
          role: memAdmin.role,
          status: memAdmin.status,
          lastLoginAt: memAdmin.lastLoginAt,
        };
      }
    }

    return null;
  }
}

export const authService = new AuthService();
