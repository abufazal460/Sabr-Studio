import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, inMemoryAdmins } from '../models/admin.model.js';
import { logger } from '../utils/logger.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
    logger.error('[FATAL] JWT_SECRET is missing in production. Process exiting.');
      process.exit(1);
    }
    throw new Error('JWT_SECRET is not configured');
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    logger.error('[FATAL] JWT_SECRET must be at least 32 characters long in production. Process exiting.');
    process.exit(1);
  }
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '24h';
}

/**
 * Idempotent first-run admin bootstrap from approved environment variables.
 * Uses ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME.
 */
export async function bootstrapAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'sabrstudio';

  if (!adminEmail || !adminPassword) {
    return null;
  }

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const count = await Admin.countDocuments({});
      if (count === 0) {
        const created = await Admin.create({
          name: adminName,
          email: adminEmail,
          password: adminPassword, // hashed by the schema pre-save hook
          role: 'admin',
          status: 'active',
        });
        logger.info(`[AuthService] Idempotent bootstrap created initial admin: ${adminEmail}`);
        return created;
      }
    } catch (err) {
      logger.error(`[AuthService] Error during admin bootstrap: ${err.message}`);
    }
  } else if (process.env.NODE_ENV !== 'production') {
    // Non-production in-memory fallback when Mongo is not connected
    if (inMemoryAdmins.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword, salt);
      const devAdmin = {
        _id: 'admin-dev',
        id: 'admin-dev',
        name: adminName,
        email: adminEmail,
        password: hash,
        role: 'admin',
        status: 'active',
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryAdmins.push(devAdmin);
      return devAdmin;
    }
  }
  return null;
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
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return null;
    }
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
        logger.error(`[AuthService] Database error during lookup: ${err.message}`);
      }
    }

    // 2. Fall back to in-memory store — NON-PRODUCTION ONLY.
    if (!admin && !isProd) {
      const memAdmin = inMemoryAdmins.find((a) => a.email.toLowerCase() === normalizedEmail);
      if (memAdmin) {
        admin = memAdmin;
        passwordHash = memAdmin.password;
      }
    }

    // 3. First-run bootstrap if collection is empty
    if (!admin && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      const bootstrapEmail = (process.env.ADMIN_EMAIL || normalizedEmail).toLowerCase().trim();
      if (bootstrapEmail === normalizedEmail) {
        const bootstrapped = await bootstrapAdmin();
        if (bootstrapped) {
          admin = bootstrapped;
          passwordHash = bootstrapped.password;
        }
      }
    }

    // If no admin found, fail with null (controller sends generic 401)
    if (!admin || !passwordHash) {
      // Execute a dummy bcrypt compare to prevent timing side-channels
      await bcrypt.compare(password, '$2a$10$LuUvjIDZM37R/uP02T1CF.JWHBdhC9HdSmx.KpZoYyNvMGIKx6nvu');
      return null;
    }

    // Check password using bcrypt against the stored hash only
    const isMatch = await bcrypt.compare(password, passwordHash);
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
        logger.error(`[AuthService] Database error during getById: ${err.message}`);
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
