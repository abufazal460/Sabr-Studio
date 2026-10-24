
/**
 * Hostinger Managed Node.js entry point.
 * Application Root: repository root
 * Entry File: backend/hostinger.cjs
 */

const path = require('node:path');

const serverEntry = path.join(__dirname, 'server.js');

(async () => {
  try {
    await import(serverEntry);
  } catch (error) {
    console.error('[Hostinger Startup Error]', error);
    process.exit(1);
  }
})();
