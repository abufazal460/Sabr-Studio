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

// Response compression
app.use(compression());

// Mount the API handler
app.use(apiHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
