// Load environment variables from this file's directory before any module
// reads process.env at import time. The default dotenv lookup uses
// process.cwd(), so starting the backend from the repo root (or a serverless
// bundler with a different cwd) silently misses backend/.env and flips the
// app into no-DB / fallback mode. An explicit path keeps root and
// backend-directory launches identical.
import dotenv from 'dotenv';
import path from 'path';
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

// dotenv.config() must run after __dirname exists but before any
// process.env read below (CORS list, cookie flags, NODE_ENV, PORT).
dotenv.config({ path: path.join(__dirname, '.env') });
const app = express();

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
      
      // Allow localhost on any port, 127.0.0.1, and cloud dev/preview domains
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isCloudPreview = /^https:\/\/[a-z0-9-]+\.(run\.app|web\.app|firebaseapp\.com|vercel\.app)$/i.test(origin);

      if (process.env.NODE_ENV !== 'production' || isLocalhost || isCloudPreview) {
        return cb(null, true);
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// --- Request timeout (30 seconds default) ---------------------------------
app.use(createRequestTimeout(30000, 'Request timeout. Please try again.'));


// --- Root status route ---------------------------------------------------------
// API-only marker: confirms the backend is running without serving the
// frontend, frontend dist files, or an SPA fallback. Real status detail
// lives on the health endpoints; unknown routes still fall through to the
// JSON 404 handler below.
// --- Root API status endpoint ------------------------------------------------
// Minimal status response confirming the backend is running (API-only mode).
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sabr Studio API is running',
    health: '/api/health',
  });
});

// --- Health check endpoint ---------------------------------------------------
// Registered BEFORE the API router so it always returns JSON.
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

// --- API routes (all under /api, plus /health) ------------------------------
// This backend is API-only. It never serves the frontend build or an SPA
// fallback; the React app is served separately (Vite dev server on :5173
// locally, static output on Vercel). apiHandler calls next() for any non-API
// path, which falls through to the JSON 404 handler below.
app.use(apiHandler);

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
