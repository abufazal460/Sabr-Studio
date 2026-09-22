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

import { apiHandler } from './apiHandler.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { connectDB } from './config/db.js';

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

// --- API routes (all under /api, plus /health) ------------------------------
// apiHandler calls next() for any non-API path so static/SPA handling below runs.
app.use(apiHandler);

// --- Production frontend (compiled Vite build) ------------------------------
// Served only when a build has been placed in backend/public. The dev backend
// stays API-only and does not require a frontend build.
const publicDir = path.join(__dirname, 'public');
const indexHtml = path.join(publicDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));

  // SPA fallback for non-API client routes (React Router deep links / refresh).
  // Paths with a file extension that were not served by express.static are
  // genuinely missing assets — let them fall through to the JSON 404 handler
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
const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Sabr Studio] Server running at http://localhost:${PORT}`);
  });
}

export default app;
