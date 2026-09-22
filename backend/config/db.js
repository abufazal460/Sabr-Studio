import mongoose from 'mongoose';

// Cache the connection on globalThis so serverless runtimes (Vercel) reuse a
// single connection across warm invocations instead of reconnecting per request.
const cached = globalThis.__sabrMongo || (globalThis.__sabrMongo = { conn: null, promise: null });

/**
 * Establish a single reusable MongoDB connection.
 *
 * Behavior:
 *  - No MONGODB_URI: logs a warning and resolves null. Services detect the
 *    disconnected state and fall back to their in-memory stores, so local
 *    development without Atlas still works.
 *  - Connection failures never crash the process; Mongoose buffers commands
 *    briefly while a background connect is in flight.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[db] MONGODB_URI not set — running with in-memory fallback data.');
    return null;
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: true,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('[db] MongoDB connected.');
  } catch (err) {
    cached.promise = null;
    console.error('[db] MongoDB connection failed:', err.message);
  }

  return cached.conn;
}

export default connectDB;
