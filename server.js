import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiHandler } from './backend/apiHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(cookieParser());

// Mount the API handler
app.use(apiHandler);

// Serve static assets from dist or public
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));
app.use(express.static(path.resolve(__dirname, 'public')));

// SPA catch-all route (Master Context §6.11 & DEPLOYMENT.md §4.4)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'), (err) => {
    if (err) {
      // If build not found, send simple fallback
      res.send(`<!DOCTYPE html><html><head><title>Sabr Studio</title></head><body><div id="root">Please run npm run build or npm run dev.</div></body></html>`);
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Sabr Studio] Server running at http://0.0.0.0:${port}`);
});
