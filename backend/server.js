// Load environment variables before any module reads process.env at import time.
import 'dotenv/config';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoose from 'mongoose';

import { apiHandler } from './apiHandler.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { connectDB } from './config/db.js';
import { createRequestTimeout } from './middlewares/timeout.middleware.js';
import { logger } from './utils/logger.js';
import { clearAllFallbackData, syncFallbackToMongoose, fallbackOrders, fallbackEnquiries } from './utils/fallbackStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Behind Hostinger/Vercel reverse proxies: needed for correct req.ip (rate
// limiting) and secure-cookie handling.
app.set('trust proxy', 1);

// --- Security headers -------------------------------------------------------
// CSP is disabled because the frontend renders images from external CDNs
// (Unsplash/Cloudinary) and relies on inline styles injected at runtime.
// All other Helmet protections remain active.
app.use(helmet({ contentSecurityPolicy: false }));

// --- CORS -------------------------------------------------------------------
// Same-origin in production, so this is a defensive allow-list. Never a
// wildcard with credentials. Localhost origins are permitted in development.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // same-origin / non-browser clients
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost:\d+$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  })
);

// --- Body & cookie parsing --------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

// --- Request timeout (30 seconds default) ---------------------------------
app.use(createRequestTimeout(30000, 'Request timeout. Please try again.'));

// --- API routes (all under /api, plus /health) ------------------------------
// apiHandler calls next() for any non-API path so static/SPA handling below runs.
app.use(apiHandler);


// --- Health check endpoint ---------------------------------------------------
// Registered BEFORE static/SPA fallback so it always returns JSON, never HTML.
app.get('/health', (req, res) => {
  const dbState = mongoose?.connection?.readyState;
  const dbStatuses = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbState !== undefined ? dbStatuses[dbState] : 'unknown',
        state: dbState,
      },
      fallbackStorage: {
        orders: {
          count: typeof fallbackOrders?.count === 'function' ? fallbackOrders.count() : 0,
        },
        enquiries: {
          count: typeof fallbackEnquiries?.count === 'function' ? fallbackEnquiries.count() : 0,
        },
      },
    },
  });
});
// --- Production frontend (compiled Vite build) ------------------------------
// Served only when a build has been placed in backend/public. The dev backend
// stays API-only and does not require a frontend build.
const publicDir = path.join(__dirname, 'public');
const indexHtml = path.join(publicDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));

  // SPA fallback for non-API client routes (React Router deep links / refresh).
  // Paths with a file extension that were not served by express.static are
  // genuinely missing assets â€” let them fall through to the JSON 404 handler
  // instead of returning HTML (which would surface as a MIME error).
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (path.extname(req.path)) return next();
    return res.sendFile(indexHtml);
  });
}

// --- 404 (JSON) for anything still unmatched --------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// --- Centralized error handler (must be last) -------------------------------
app.use(errorHandler);

// --- Database ---------------------------------------------------------------
// Background connect; services fall back to in-memory data until it resolves.
connectDB();

// --- Start ------------------------------------------------------------------
// Vercel imports `app` directly as a serverless handler; only listen elsewhere.
const PORT = parseInt(process.env.PORT, 10) || 3000;
let server;

if (!process.env.VERCEL) {
  server = app.listen(PORT, () => {
    logger.info(`[Sabr Studio] Server running at http://localhost:${PORT}`);
  })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`[Sabr Studio] Port ${PORT} already in use. Free the port or change the PORT env variable.`);
        process.exit(1);
      } else {
        logger.error('[Server] Startup error:', err);
        process.exit(1);
      }
    });
}

// --- Graceful Shutdown ----------------------------------------------------
const shutdown = async (signal) => {
  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    logger.error('[Shutdown] Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 second max shutdown time

  try {
    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info('[Shutdown] HTTP server closed');
      });
    }

    // Attempt to sync any pending fallback data to MongoDB
    logger.info('[Shutdown] Attempting to sync fallback data to MongoDB...');
    const syncResult = await syncFallbackToMongoose({
      orders: true,
      enquiries: true,
    });
    
    if (syncResult.orders.synced > 0 || syncResult.enquiries.synced > 0) {
      logger.info('[Shutdown] Fallback data synced:', syncResult);
    }

    // Clear fallback storage after sync attempt
    clearAllFallbackData();

    clearTimeout(shutdownTimeout);
    logger.info('[Shutdown] Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    logger.error('[Shutdown] Error during shutdown:', err.message);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('[Process] Uncaught Exception:', err.message, err.stack);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately - let the error handler process it
});

export default app;
