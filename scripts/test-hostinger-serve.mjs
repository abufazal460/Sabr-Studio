import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Hostinger production smoke test: boots backend/server.js the way the panel
// does (cwd = backend/, Hostinger-assigned PORT, SERVE_FRONTEND=true) with a
// stubbed Atlas connection, then asserts:
//   GET /              -> 200 text/html (React index.html, NOT API JSON)
//   GET /admin/login   -> 200 text/html (SPA client-route fallback)
//   GET /api/health    -> 200 JSON { status:'ok' } (lightweight ping)
//   GET /health        -> 200 JSON { success:true } (detailed diagnostics)
//   GET /assets/...    -> 200 hashed JS bundle from frontend/dist
// Cleanup: kills the server and deletes THIS file's temp .env — never touches
// real backend/.env. Safe to run anywhere with backend/node_modules present.

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backendDir = path.join(root, 'backend');
const distIndex = path.join(root, 'frontend', 'dist', 'index.html');
const tmpEnv = path.join(backendDir, '.env.hostinger-smoke');

if (!fs.existsSync(distIndex)) {
  console.error('[hostinger-smoke] FAIL: frontend/dist/index.html missing — run `npm run build` first.');
  process.exit(1);
}

const PORT = 46531;
const server = spawn('node', ['server.js'], {
  cwd: backendDir,
  env: {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'production',
    SERVE_FRONTEND: 'true',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/sabr-smoke-unreachable',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (c) => { logs += c; });
server.stderr.on('data', (c) => { logs += c; });

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, ok: Boolean(cond), detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function get(pathname, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: '127.0.0.1', port: PORT, path: pathname, method: 'GET', headers, timeout: 8000 },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      },
    );
    req.on('error', (e) => resolve({ status: 0, headers: {}, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, headers: {}, body: 'timeout' }); });
    req.end();
  });
}

async function waitForBoot() {
  for (let i = 0; i < 40; i++) {
    const r = await get('/api/health');
    if (r.status === 200) return true;
    await new Promise((r2) => setTimeout(r2, 500));
  }
  return false;
}

let exitCode = 0;
try {
  if (!(await waitForBoot())) {
    console.error('[hostinger-smoke] FAIL: server did not boot within 20s');
    console.error(logs.slice(-2000));
    process.exitCode = 1;
    process.exit(1);
  }

  const home = await get('/');
  check('GET / serves React HTML (not API JSON)',
    home.status === 200 && /text\/html/.test(home.headers['content-type'] || '') && home.body.includes('<div id="root">'),
    `status=${home.status} ct=${home.headers['content-type'] || 'none'}`);
  check('GET / is NOT the API marker JSON', !home.body.includes('Sabr Studio API is running'));

  const deep = await get('/admin/login');
  check('GET /admin/login SPA fallback serves index.html',
    deep.status === 200 && /text\/html/.test(deep.headers['content-type'] || '') && deep.body.includes('<div id="root">'),
    `status=${deep.status}`);

  const api = await get('/api/health');
  let apiJson = null;
  try { apiJson = JSON.parse(api.body); } catch {}
  check('GET /api/health still JSON ping', api.status === 200 && apiJson?.status === 'ok', `status=${api.status} body=${api.body.slice(0, 60)}`);

  const h = await get('/health');
  let hJson = null;
  try { hJson = JSON.parse(h.body); } catch {}
  check('GET /health still JSON', h.status === 200 && hJson?.success === true, `status=${h.status}`);

  const assetsDir = path.join(root, 'frontend', 'dist', 'assets');
  const jsBundle = fs.readdirSync(assetsDir).find((f) => f.endsWith('.js'));
  const asset = await get(`/assets/${jsBundle}`);
  check('GET /assets/*.js serves built bundle',
    asset.status === 200 && (asset.headers['content-type'] || '').includes('javascript'),
    `${jsBundle} status=${asset.status}`);

  check('startup log confirms frontend serving', logs.includes('[hosting] Serving frontend from'));

  const failed = results.filter((r) => !r.ok);
  if (failed.length) exitCode = 1;
  console.log(`\n[hostinger-smoke] ${results.length - failed.length}/${results.length} checks passed`);
} finally {
  server.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 800));
  try { if (!server.killed) server.kill('SIGKILL'); } catch {}
}
process.exit(exitCode);
