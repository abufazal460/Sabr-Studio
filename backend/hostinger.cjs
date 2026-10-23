// Hostinger managed-Node entry. The dashboard "Entry file" points here
// (Application Root = repo root, Entry file = backend/hostinger.cjs).
// Resolves server.js relative to THIS file so the import works regardless of
// the panel's working directory. `backend/package.json` stays ESM
// ("type": "module") — this .cjs bridge exists precisely so a CommonJS entry
// can boot the ESM server without touching the module type.
const { createRequire } = require('module');
const path = require('path');
const serverEntry = path.join(__dirname, 'server.js');
const require = createRequire(require.resolve('./package.json'));
const { logger } = require('../utils/logger.js');

(async () => {
  try {
    await import(serverEntry);
  } catch (error) {
    logger.error(`[Hostinger Startup Error]: ${error.message}`);
    process.exit(1);
  }
})();
