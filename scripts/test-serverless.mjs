process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';
const { default: app } = await import('../api/index.js');
const http = await import('http');
const server = http.createServer(app);
server.listen(3999, async () => {
  const get = (p, opts={}) => new Promise((res, rej) => {
    const req = http.request({ host: 'localhost', port: 3999, path: p, method: opts.method || 'GET', headers: opts.headers || {} }, (r) => {
      let b = ''; r.on('data', (c) => b += c); r.on('end', () => res({ s: r.statusCode, ct: r.headers['content-type'] || '', cookie: r.headers['set-cookie'] || '', body: b.slice(0, 400) }));
    });
    req.on('error', rej);
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
  console.log('POST /api/auth/login ->', r6.s, r6.ct, r6.body.slice(0,120));
  console.log('SET-COOKIE:', r6.cookie ? String(r6.cookie).slice(0,120) : '(none)');
  const cookie = Array.isArray(r6.cookie) ? r6.cookie[0].split(';')[0] : String(r6.cookie || '').split(';')[0];
  const r7 = await get('/api/auth/me', { headers: cookie ? { Cookie: cookie } : {} });
  console.log('GET /api/auth/me      ->', r7.s, r7.ct, r7.body.slice(0,120));
  const r8 = await get('/api/retail');
  console.log('GET /api/retail       ->', r8.s, r8.ct, r8.body.slice(0,120));
  const r9 = await get('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  console.log('POST /api/enquiries {}->', r9.s, r9.ct, r9.body.slice(0,160), '(must be fast 400, not hang)');
  server.close(() => { console.log('SERVERLESS SIMULATION DONE - module loaded WITHOUT listen() crash'); process.exit(0); });
});

