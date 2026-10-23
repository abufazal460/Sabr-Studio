import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const isProd = () => process.env.NODE_ENV === 'production';

// Cache the connection on globalThis so serverless runtimes (Vercel) reuse a
// single connection across warm invocations instead of reconnecting per request.
const cached = globalThis.__sabrMongo || (globalThis.__sabrMongo = { conn: null, promise: null });

// Bounded retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Production database name. The app derives the DB from MONGODB_URI's path
// segment; when the URI has no path we pin it here so production can never
// silently fall back to the legacy `test` database.
const PROD_DB_NAME = process.env.MONGODB_DB_NAME || 'sabrstudio';

// Fail-safe: the legacy source database must never be selected in production.
const FORBIDDEN_DB_NAMES = new Set(['test']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Return the effective MongoDB database name without printing credentials.
 * Prefers the path segment of MONGODB_URI; falls back to PROD_DB_NAME in
 * production only. Returns null in non-production when neither is set.
 */
export function getEffectiveDbName() {
  const uri = process.env.MONGODB_URI || '';
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]*\/([^?]*)/);
  const fromUri = match && match[1] ? decodeURIComponent(match[1]) : '';
  if (fromUri) return fromUri;
  if (isProd()) return PROD_DB_NAME;
  return null;
}

/**
 * Establish a single reusable MongoDB connection with bounded retries.
 *
 * Behavior:
 *  - No MONGODB_URI in production: throws (env.js should have already caught this).
 *  - No MONGODB_URI in dev: logs a warning and resolves null (in-memory fallback).
 *  - Production refuses to connect to a forbidden legacy database (e.g. `test`).
 *  - When the URI has no database path in production, explicitly selects PROD_DB_NAME.
 *  - Connection failures are retried up to MAX_RETRIES times.
 *  - autoIndex is disabled in production (indexes should be synced via
 *    scripts/sync-indexes.mjs against Atlas).
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (isProd()) {
      throw new Error('MONGODB_URI is not set — cannot start in production without a database.');
    }
    logger.warn('[db] MONGODB_URI not set — running with in-memory fallback data.');
    return null;
  }

  const effectiveName = getEffectiveDbName();
  if (isProd()) {
    if (!effectiveName) {
      throw new Error('Production database name could not be determined — set MONGODB_DB_NAME or include it in MONGODB_URI.');
    }
    if (FORBIDDEN_DB_NAMES.has(effectiveName)) {
      throw new Error(`Refusing to start production against forbidden database "${effectiveName}". Set MONGODB_URI to the sabrstudio database.`);
    }
  }

  // Reuse existing active connection on warm instances
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Globally disable autoIndex in production to prevent background index builds
  if (isProd()) {
    mongoose.set('autoIndex', false);
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      let lastErr = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const conn = await mongoose.connect(uri, {
            dbName: effectiveName || undefined,
            bufferCommands: false, // In production, fail fast rather than buffering queries
            autoIndex: !isProd(),  // Disable autoIndex in production
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
          });
          logger.info(`[db] MongoDB connected (db=${mongoose.connection.name}).`);
          return conn;
        } catch (err) {
          lastErr = err;
          // Never log the URI or any credentials — only the sanitized error message
          logger.error(`[db] MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt);
          }
        }
      }

      // All retries exhausted
      throw lastErr;
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // Allow future retry
    cached.conn = null;
    // In production, propagate the error so callers know DB is down
    if (isProd()) {
      throw err;
    }
    logger.error('[db] MongoDB connection failed after retries: ${err.message}');
  }

  return cached.conn;
}

export default connectDB;
