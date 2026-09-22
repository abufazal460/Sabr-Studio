// Vercel serverless entry point.
// Vercel routes /api/* here (see root vercel.json). The Express app handles all
// /api routes and returns JSON 404s for unknown API paths. The React frontend
// is served by Vercel as static output (frontend/dist), not through this function.
import app from '../backend/server.js';

export default app;
