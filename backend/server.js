import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { apiHandler } from './apiHandler.js';
import { errorHandler } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Security & Parsing Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Response compression per TRD §27 / PERF-15 / Master Context §6.1
app.use(compression());

// Mount the API handler
app.use(apiHandler);

// Static Asset Delivery with Cache Control (1y for hashed assets, 0 for html)
const distPath = path.resolve(__dirname, '../frontend/dist');
const publicPath = path.resolve(__dirname, 'public');

app.use('/assets', express.static(path.resolve(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true
}));
app.use(express.static(distPath, { maxAge: 0 }));
app.use(express.static(publicPath, { maxAge: 0 }));

// Centralized error handler
app.use(errorHandler);

// SPA catch-all route (Master Context §6.11 & DEPLOYMENT.md §4.4)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.resolve(publicPath, 'index.html'), (publicErr) => {
        if (publicErr) {
          res.send(`<!DOCTYPE html><html><head><title>Sabr Studio</title></head><body><div id="root">Please run npm run build in frontend/ or npm run dev.</div></body></html>`);
        }
      });
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Sabr Studio API] Server running at http://0.0.0.0:${port}`);
});

export default app;
