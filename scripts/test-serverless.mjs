process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';
const { default: app } = await import('../api/index.js');
const http = await import('http');
const server = http.createServer(app);
server.listen(3999, async () => {
  const get = (p, opts={}) => new Promise((res) => {
    const req = http.request({ host: 'localhost', port: 3999, path: p, method: opts.method || 'GET', headers: opts.headers || {} }, (r) => {
      let b = ''; r.on('data', (c) => b += c); r.on('end', () => res({ s: r.statusCode, ct: r.headers['content-type'] || '', body: b.slice(0, 120) }));
    });
    if (opts.body) req.write(opts.body);
    req.end();
  });
  const r1 = await get('/api/health');
  console.log('GET /api/health      ->', r1.s, r1.ct);
  const r2 = await get('/health');
  console.log('GET /health          ->', r2.s, r2.ct);
  const r3 = await get('/api/projects');
  console.log('GET /api/projects    ->', r3.s, r3.ct);
  const r4 = await get('/api/does-not-exist');
  console.log('GET /api/unknown     ->', r4.s, r4.ct, '(must be JSON 404)');
  const r5 = await get('/projects');
  console.log('GET /projects (SPA)  ->', r5.s, r5.ct);
  const r6 = await get('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin', password: 'admin' }) });
  console.log('POST /api/auth/login ->', r6.s, r6.ct);
  console.log('SET-COOKIE:', r6.body.includes('success') ? '(see headers)' : '');
  server.close(() => { console.log('SERVERLESS SIMULATION DONE - module loaded WITHOUT listen() crash'); process.exit(0); });
});

