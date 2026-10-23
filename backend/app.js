// Load environment variables from this file's directory before any module
// reads process.env at import time. The default dotenv lookup uses
// process.cwd(), so starting the backend from the repo root (or a serverless
// bundler with a different cwd) silently misses backend/.env and flips the
// app into no-DB / fallback mode. An explicit path keeps root and
// backend-directory launches identical.
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
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
import { attachRequestId, requestLogger } from './middlewares/requestLogger.middleware.js';

import { fallbackOrders, fallbackEnquiries } from './utils/fallbackStorage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dotenv.config() must run after __dirname exists but before any
// process.env read below (CORS list, cookie flags, NODE_ENV, PORT).
dotenv.config({ path: path.join(__dirname, '.env') });
const app = express();

const isVercel = Boolean(process.env.VERCEL);

// Same-domain SPA hosting flag (e.g. Hostinger single Node app). When true, this
// Express server also serves the built frontend (../frontend/dist) and falls
// back to index.html for client-side routes.
// Hostinger quirk: Vercel is never set there; Hostinger also does not guarantee
// NODE_ENV=production in the Node runtime env, and its build output lives under
// the app root (frontend/dist is git-ignored, so it only exists if the Hostinger
// build step produced it). Therefore the flag is explicit-first:
//   SERVE_FRONTEND=true  => always serve (recommended Hostinger setting);
//   SERVE_FRONTEND=false => never serve (API-only, honors explicit opt-out);
//   unset                => auto-detect (production + non-Vercel + dist exists).
// Local dev (Vite on :5173) and Vercel (static output + serverless /api) stay
// completely unaffected.
const frontendDist = path.join(__dirname, '../frontend/dist');
const serveFrontend = isVercel
  ? false
  : process.env.SERVE_FRONTEND === 'true'
    ? true
    : process.env.SERVE_FRONTEND === 'false'
      ? false
      : process.env.NODE_ENV === 'production' &&
        fs.existsSync(path.join(frontendDist, 'index.html'));

// Behind Hostinger/Vercel reverse proxies: needed for correct req.ip (rate
// limiting) and secure-cookie handling.
app.set('trust proxy', 1);

// --- Security headers -------------------------------------------------------
// CSP is disabled because the frontend renders images from external CDNs
// (Unsplash/Cloudinary) and relies on inline styles injected at runtime.
// Cross-Origin-Resource-Policy is set to cross-origin so frontend on port 5173
// can communicate seamlessly with backend on port 3000 without browser CORP blocks.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// --- CORS -------------------------------------------------------------------

let allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Local development default when no explicit allow-list is configured.
// Production keeps the explicit CORS_ORIGIN list (or Vercel URL fallback).
if (!allowedOrigins.length && process.env.NODE_ENV !== 'production') {
  allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

// If no explicit origins are configured, fall back to the Vercel deployment URL (if available).
if (!allowedOrigins.length && process.env.VERCEL_URL) {
  allowedOrigins = [`https://${process.env.VERCEL_URL}`];
}

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // same-origin / non-browser clients
      if (allowedOrigins.includes(origin)) return cb(null, true);
      
      if (process.env.NODE_ENV !== 'production') {
        const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        const isCloudPreview = /^https:\/\/[a-z0-9-]+\.(run\.app|web\.app|firebaseapp\.com|vercel\.app)$/i.test(origin);
        if (isLocalhost || isCloudPreview) {
          return cb(null, true);
        }
      }
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  })
);

// --- Body & cookie parsing --------------------------------------------------
// Capture rawBody on webhook route so Razorpay HMAC can verify the exact bytes.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    if (typeof req.url === 'string' && req.url.includes('/orders/webhook')) req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// --- Request timeout (30 seconds default) ---------------------------------
app.use(attachRequestId);
app.use(requestLogger);
app.use(createRequestTimeout(30000, 'Request timeout. Please try again.'));


// --- Same-domain SPA static layer (Hostinger single Node app) ----------------
// Registered BEFORE the API router on purpose: Express matches middleware in
// registration order, and apiHandler is a catch-all `app.use(...)` that would
// otherwise swallow `/` (and non-/api paths) before express.static runs.
// express.static only answers when a real file exists (/, /index.html, hashed
// /assets/*, /favicon.svg, ...) and calls next() for everything else, so /api
// and /health always fall through to the API routes below.
if (serveFrontend && fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist));
  logger.info(`[hosting] Serving frontend from ${frontendDist}`);
} else if (process.env.SERVE_FRONTEND === 'true') {
  logger.warn(`[hosting] SERVE_FRONTEND=true but no build at ${path.join(frontendDist, 'index.html')} — serving API only. Check the Hostinger build step / output directory.`);
}


// --- Root API status endpoint ------------------------------------------------
// API-only marker when this process does NOT serve the SPA. In same-domain SPA
// mode (Hostinger) GET / must fall through to express.static so the React
// index.html is returned — an unconditional JSON response here is exactly why
// https://sabrstudio.in/ showed {"success":true,...} instead of the frontend.
// Registered before the static block but guarded by serveFrontend; Vercel is
// unaffected (it never routes / to the function — static /index.html wins).
if (!serveFrontend) {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Sabr Studio API is running',
      health: '/api/health',
    });
  });
}

// --- Health check endpoint ---------------------------------------------------
// Registered BEFORE the API router so it always returns JSON.
// Reports API up and DB connected or disconnected — no secrets or connection strings.
app.get('/health', (req, res) => {
  const dbState = mongoose?.connection?.readyState;
  const dbStatuses = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbStatus = dbState !== undefined ? (dbStatuses[dbState] || 'unknown') : 'unknown';

  const data = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
  };

  // In development, include fallback storage counts for debugging.
  if (process.env.NODE_ENV !== 'production') {
    data.fallbackStorage = {
      orders: typeof fallbackOrders?.count === 'function' ? fallbackOrders.count() : 0,
      enquiries: typeof fallbackEnquiries?.count === 'function' ? fallbackEnquiries.count() : 0,
    };
  }

  res.status(200).json({ success: true, data });
});

// --- API routes (all under /api, plus /health) ------------------------------
// This backend is API-only. It never serves the frontend build or an SPA
// fallback; the React app is served separately (Vite dev server on :5173
// locally, static output on Vercel). apiHandler calls next() for any non-API
// path, which falls through to the JSON 404 handler below.
// --- Production database fail-safe (§5) -------------------------------------
// In production the app must NEVER silently serve in-memory / fallback demo data
// when MongoDB Atlas is unreachable. If the connection is not ready, give the
// (cached) connect one chance, then return a sanitized 503 instead of fake data.
// Development keeps the in-memory fallback so local work needs no Atlas.
app.use('/api', async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState === 1) return next();
  try { await connectDB(); } catch { /* sanitized response below */ }
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    success: false,
    message: 'Service temporarily unavailable. Please try again shortly.',
    code: 'DB_UNAVAILABLE',
  });
});

app.use(apiHandler);

// --- Same-domain SPA client-route fallback (deep links / refreshes) ----------
// Serves index.html for non-API, non-asset paths so React Router routes (e.g.
// /projects/:id, /retail, /admin/...) return 200 instead of the JSON 404 below.
// Kept AFTER the API router but BEFORE the 404 handler, and strictly limited:
// /api/*, /health, and real static files are never intercepted here.
if (serveFrontend && fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
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


export default app;
