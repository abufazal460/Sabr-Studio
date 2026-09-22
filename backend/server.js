import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { apiHandler } from './apiHandler.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Security & Parsing Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// home routes  
app.get("/" , (req, res) => {
  res.send("hello world")
})

// Health check endpoint (unauthenticated)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Mount API routes
app.use(apiHandler);

// Centralized error handling
app.use(errorHandler);

// Start server when run locally; Vercel serverless imports app directly
const PORT = process.env.PORT || 3001;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Sabr Studio API] Server running at http://localhost:${PORT}`);
  });
}

export default app;
