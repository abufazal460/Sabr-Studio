import mongoose from 'mongoose';

const isProd = () => process.env.NODE_ENV === 'production';

// Cache the connection on globalThis so serverless runtimes (Vercel) reuse a
// single connection across warm invocations instead of reconnecting per request.
const cached = globalThis.__sabrMongo || (globalThis.__sabrMongo = { conn: null, promise: null });

// Bounded retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Establish a single reusable MongoDB connection with bounded retries.
 *
 * Behavior:
 *  - No MONGODB_URI in production: throws (env.js should have already caught this).
 *  - No MONGODB_URI in dev: logs a warning and resolves null (in-memory fallback).
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
    console.warn('[db] MONGODB_URI not set — running with in-memory fallback data.');
    return null;
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = (async () => {
      let lastErr = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const conn = await mongoose.connect(uri, {
            bufferCommands: !isProd(), // In production, fail fast rather than buffering
            autoIndex: !isProd(),      // Disable autoIndex in production
          });
          console.log('[db] MongoDB connected.');
          return conn;
        } catch (err) {
          lastErr = err;
          // Never log the URI or any part of it — only the error message
          console.error(`[db] MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);
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
    console.error('[db] MongoDB connection failed after retries:', err.message);
  }

  return cached.conn;
}

export default connectDB;
