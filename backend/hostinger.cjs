
(async () => {
  try {
    await import('./server.js');
  } catch (error) {
    console.error('[Hostinger Startup Error]', error);
    process.exit(1);
  }
})();
