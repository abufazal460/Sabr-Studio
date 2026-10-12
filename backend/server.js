// Production entry point (Hostinger managed Node.js / any long-lived Node host).
// Local development keeps using dev.js (nodemon + dev seed). This file is what
// `npm start` and the Hostinger "Entry file" should point at.
//
// Port: Hostinger injects the assigned listening port via process.env.PORT (the
// panel-provided 65002 is that internal port). We NEVER hardcode it — PORT is
// read first, then BACKEND_PORT, then 3000 as a local default.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const [{ logger }, { default: app }, { connectDB }] = await Promise.all([
  import('./utils/logger.js'),
  import('./app.js'),
  import('./config/db.js'),
]);

const PORT = parseInt(process.env.PORT, 10) ||
  parseInt(process.env.BACKEND_PORT, 10) || 3000;
// Hostinger runs behind its own reverse proxy: binding all interfaces is the
// safe default. HOST stays overridable but never silently becomes 'localhost'
// (a localhost-only bind would make the app unreachable from the proxy).
const HOST = process.env.HOST || undefined;
// Hostinger does not guarantee NODE_ENV=production in the Node runtime env.
// The same-domain SPA layer and the production DB fail-safe both key off it,
// so default it here (explicit values always win). Local dev sets
// NODE_ENV=development in backend/.env; Vercel sets it to production itself.
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

// Establish the DB connection before accepting traffic. In production the app
// has a fail-safe guard that returns 503 (never in-memory/fake data) if Atlas is
// unreachable, so we still listen to let /health report the real state.
await connectDB();

const server = app.listen(PORT, HOST, () => {
  logger.info(`[Sabr Studio] Production server listening on ${HOST ? HOST + ':' : ''}${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`[Server] Port ${PORT} already in use. Set PORT/BACKEND_PORT or free the port.`);
  } else {
    logger.error('[Server] Startup error:', err.message);
  }
  process.exit(1);
});

const shutdown = (signal) => {
  logger.info(`[Shutdown] Received ${signal}, closing server...`);
  const force = setTimeout(() => process.exit(1), 15000);
  server.close(() => { clearTimeout(force); process.exit(0); });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
