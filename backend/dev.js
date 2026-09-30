// Load backend/.env before importing the application. Static ESM imports are
// evaluated before this module's body, so dotenv.config() inside app.js would
// otherwise run after services have already read environment variables.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const [{ logger }, { clearAllFallbackData, syncFallbackToMongoose }, { default: app }] =
  await Promise.all([
    import('./utils/logger.js'),
    import('./utils/fallbackStorage.js'),
    import('./app.js'),
  ]);

const PORT = parseInt(process.env.BACKEND_PORT, 10) ||
  (process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : 3000);
let server;

server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`[Sabr Studio] Server running at http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`[Sabr Studio] Port ${PORT} already in use. Free the port or change the PORT env variable.`);
    process.exit(1);
  } else {
    logger.error('[Server] Startup error:', err);
    process.exit(1);
  }
});

// --- Graceful Shutdown ----------------------------------------------------
const shutdown = async (signal) => {
  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    logger.error('[Shutdown] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);

  try {
    if (server) {
      server.close(() => {
        logger.info('[Shutdown] HTTP server closed');
      });
    }

    logger.info('[Shutdown] Attempting to sync fallback data to MongoDB...');
    const syncResult = await syncFallbackToMongoose({ orders: true, enquiries: true });
    
    if (syncResult.orders.synced > 0 || syncResult.enquiries.synced > 0) {
      logger.info('[Shutdown] Fallback data synced:', syncResult);
    }

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

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('[Process] Uncaught Exception:', err.message, err.stack);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});
