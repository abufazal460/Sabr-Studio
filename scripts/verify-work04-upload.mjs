/**
 * Work 04 verification harness — part 1/3 (fixtures, mock Cloudinary, helpers).
 */
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const MOCK_PORT = 4599;
const APP_PORT = 4711;

// --- Minimal valid image fixtures (magic bytes are what matter) ----------------
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==',
  'base64'
);
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64'
);
// A real Windows executable header: starts with 'MZ'.
const EXE_BYTES = Buffer.concat([
  Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
  Buffer.alloc(2048, 0x41),
  Buffer.from('This program cannot be run in DOS mode.'),
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? ' PASS ' : ' FAIL '}] ${id} - ${detail}`);
}

// --- Mock Cloudinary API (same request/response shape as the real service) -----
const mockUploads = [];
let failDelete = false;

const mockCloudinary = http.createServer((req, res) => {
  let body = Buffer.alloc(0);
  req.on('data', (c) => (body = Buffer.concat([body, c])));
  req.on('end', () => {
    const raw = body.toString('latin1');

    if (req.url.includes('/destroy')) {
      if (failDelete) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'injected delete failure' } }));
      }
      const m = raw.match(/name="public_id"\r\n\r\n([^\r]+)/);
      mockUploads.deleted = (mockUploads.deleted || []).concat(m ? [m[1]] : []);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result: 'ok' }));
    }

    const grab = (key) => {
      const m = raw.match(new RegExp(`name="${key}"\\r\\n\\r\\n([^\\r]*)`));
      return m ? m[1] : null;
    };
    const folder = grab('folder');
    const publicId = grab('public_id');
    mockUploads.push({ folder, publicId, size: body.length });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        public_id: `${folder}/${publicId}`,
        secure_url: `https://res.cloudinary.com/demo-cloud/image/upload/v1/${folder}/${publicId}.jpg`,
        width: 1600,
        height: 900,
        format: 'jpg',
        bytes: body.length,
        resource_type: 'image',
      })
    );
  });
});


// --- HTTP helpers --------------------------------------------------------------
function request(base, method, pathname, { body = null, headers = {}, multipart = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, base);
    const h = { ...headers };
    let payload = null;
    if (multipart) {
      payload = multipart.body;
      h['Content-Type'] = `multipart/form-data; boundary=${multipart.boundary}`;
      h['Content-Length'] = Buffer.byteLength(payload);
    } else if (body) {
      payload = JSON.stringify(body);
      h['Content-Type'] = 'application/json';
      h['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method, headers: h },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function multipartFile(field, filename, buffer, mimeType, extra = {}) {
  const boundary = `----sabrtest${crypto.randomBytes(8).toString('hex')}`;
  let out = '';
  for (const [k, v] of Object.entries(extra)) {
    out += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
  }
  out +=
    `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  return {
    boundary,
    body: Buffer.concat([
      Buffer.from(out, 'utf8'),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
    ]),
  };
}

const DEV_ENV = {
  NODE_ENV: 'development',
  MONGODB_URI: '', // in-memory fallback keeps the harness DB-free
  JWT_SECRET: 'work04-verification-secret-at-least-32-chars-long',
  JWT_EXPIRES_IN: '7d',
  ADMIN_EMAIL: 'admin@sabrstudio.in',
  ADMIN_PASSWORD: 'Work04Verify!2026',
  ADMIN_NAME: 'sabrstudio',
  COOKIE_SECURE: 'false',
  COOKIE_SAME_SITE: 'lax',
  CORS_ORIGIN: 'http://localhost:5173',
};

async function waitForHealth(base, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await request(base, 'GET', '/api/health');
      if (r.status === 200) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

function spawnApp(port, extraEnv) {
  return spawn('node', ['backend/dev.js'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, ...DEV_ENV, PORT: String(port), BACKEND_PORT: String(port), ...extraEnv },
  });
}

async function login(base) {
  const res = await request(base, 'POST', '/api/auth/login', {
    body: { email: DEV_ENV.ADMIN_EMAIL, password: DEV_ENV.ADMIN_PASSWORD },
  });
  const raw = res.headers['set-cookie'];
  return (Array.isArray(raw) ? raw[0] : String(raw || '')).split(';')[0];
}
// --- Checks --------------------------------------------------------------------
async function main() {
  await new Promise((r) => mockCloudinary.listen(MOCK_PORT, r));
  console.log(`[mock] Cloudinary stand-in listening on ${MOCK_PORT}`);

  const spawned = [];
  const app = spawnApp(APP_PORT, {
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: 'mock-key',
    CLOUDINARY_API_SECRET: 'mock-secret',
    CLOUDINARY_URL: `cloudinary://mock-key:mock-secret@demo-cloud?upload_prefix=http://127.0.0.1:${MOCK_PORT}`,
  });
  spawned.push(app);
  app.stderr.on('data', (d) => process.stdout.write(`[app:err] ${d}`));

  const base = `http://127.0.0.1:${APP_PORT}`;
  if (!(await waitForHealth(base))) {
    console.error('App did not become healthy.');
    process.exit(1);
  }
  console.log(`[app] healthy on ${base}\n`);

  {
    const mp = multipartFile('file', 'x.jpg', TINY_JPEG, 'image/jpeg', { folder: 'projects' });
    const r = await request(base, 'POST', '/api/admin/uploads', { multipart: mp });
    check('1 unauthenticated -> 401', r.status === 401, `got ${r.status} ${r.body?.message || ''}`);
  }

  const auth = { Cookie: await login(base) };
  check('login -> 200 (cookie issued)', Boolean(auth.Cookie), `cookie=${Boolean(auth.Cookie)}`);

  let uploaded = null;
  {
    const mp = multipartFile('file', 'my holiday photo.jpg', TINY_JPEG, 'image/jpeg', {
      folder: 'projects',
    });
    const r = await request(base, 'POST', '/api/admin/uploads', { headers: auth, multipart: mp });
    const img = r.body?.data?.images?.[0];
    uploaded = img;
    check(
      '2 real .jpg -> 201 {url,publicId}',
      r.status === 201 && !!img?.url && !!img?.publicId,
      `status ${r.status} url=${!!img?.url} publicId=${!!img?.publicId}`
    );
    const last = mockUploads[mockUploads.length - 1];
    check(
      '2b fixed folder sabrstudio/projects',
      last?.folder === 'sabrstudio/projects',
      `folder=${last?.folder}`
    );
    check(
      '2c client filename ignored, random public_id',
      !!last?.publicId && !last.publicId.includes('holiday'),
      `public_id=${last?.publicId}`
    );
  }
