/**
 * Work 04 verification â€” part 3: retail replace/delete Cloudinary cleanup.
 *
 * Uses a local mock Cloudinary so destroy() calls are observable, and asserts:
 *   - replacing a retail image deletes the OLD asset
 *   - a stock/publish toggle (no image in payload) deletes NOTHING
 *   - deleting the product deletes its asset
 */
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const MOCK_PORT = 4699;
const APP_PORT = 4811;

const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q==',
  'base64'
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const destroyed = [];

const check = (id, ok, detail) => {
  results.push({ id, ok });
  console.log(`[${ok ? ' PASS ' : ' FAIL '}] ${id} - ${detail}`);
};

const mock = http.createServer((req, res) => {
  let body = Buffer.alloc(0);
  req.on('data', (c) => (body = Buffer.concat([body, c])));
  req.on('end', () => {
    const raw = body.toString('latin1');
    if (req.url.includes('/destroy')) {
      const m = raw.match(/name="public_id"\r\n\r\n([^\r]+)/);
      if (m) destroyed.push(m[1]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result: 'ok' }));
    }
    const grab = (k) => {
      const m = raw.match(new RegExp(`name="${k}"\\r\\n\\r\\n([^\\r]*)`));
      return m ? m[1] : null;
    };
    const folder = grab('folder');
    const publicId = grab('public_id');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        public_id: `${folder}/${publicId}`,
        secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${folder}/${publicId}.jpg`,
        width: 800, height: 800, format: 'jpg', bytes: body.length, resource_type: 'image',
      })
    );
  });
});

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
  const boundary = `----sabr${crypto.randomBytes(6).toString('hex')}`;
  let out = '';
  for (const [k, v] of Object.entries(extra)) {
    out += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
  }
  out += `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  return {
    boundary,
    body: Buffer.concat([
      Buffer.from(out, 'utf8'),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
    ]),
  };
}
async function main() {
  await new Promise((r) => mock.listen(MOCK_PORT, r));
  const spawned = [];
  const app = spawn('node', ['backend/dev.js'], {
    cwd: rootDir, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development', PORT: String(APP_PORT), BACKEND_PORT: String(APP_PORT),
      MONGODB_URI: '', JWT_SECRET: 'work04-verification-secret-at-least-32-chars-long',
      JWT_EXPIRES_IN: '7d', ADMIN_EMAIL: 'admin@sabrstudio.in',
      ADMIN_PASSWORD: 'Work04Verify!2026', ADMIN_NAME: 'sabrstudio',
      COOKIE_SECURE: 'false', COOKIE_SAME_SITE: 'lax', CORS_ORIGIN: 'http://localhost:5173',
      CLOUDINARY_CLOUD_NAME: 'demo-cloud', CLOUDINARY_API_KEY: 'mock-key',
      CLOUDINARY_API_SECRET: 'mock-secret',
      CLOUDINARY_URL: `cloudinary://mock-key:mock-secret@demo-cloud?upload_prefix=http://127.0.0.1:${MOCK_PORT}`,
    },
  });
  spawned.push(app);
  app.stderr.on('data', (d) => process.stdout.write(`[app:err] ${d}`));

  const base = `http://127.0.0.1:${APP_PORT}`;
  let healthy = false;
  for (let i = 0; i < 40 && !healthy; i++) {
    try { healthy = (await request(base, 'GET', '/api/health')).status === 200; } catch {}
    if (!healthy) await sleep(500);
  }
  if (!healthy) { console.error('app not healthy'); process.exit(1); }
  console.log(`[app] healthy on ${base}\n`);

  const login = await request(base, 'POST', '/api/auth/login', {
    body: { email: 'admin@sabrstudio.in', password: 'Work04Verify!2026' },
  });
  const rawCookie = login.headers?.['set-cookie'];
  const auth = { Cookie: (Array.isArray(rawCookie) ? rawCookie[0] : String(rawCookie || '')).split(';')[0] };

  const upA = await request(base, 'POST', '/api/admin/uploads', {
    headers: auth,
    multipart: multipartFile('file', 'a.jpg', TINY_JPEG, 'image/jpeg', { folder: 'retail' }),
  });
  const imgA = upA.body?.data?.images?.[0];
  check('A retail upload -> 201', upA.status === 201 && !!imgA?.publicId, `publicId=${imgA?.publicId}`);

  const created = await request(base, 'POST', '/api/admin/retail', {
    headers: auth,
    body: {
      title: 'Work 04 Cleanup Test Chair',
      category: 'Chair',
      price: 45000,
      description: 'Temporary item used to verify Cloudinary cleanup on replace and delete.',
      image: imgA.url,
      imagePublicId: imgA.publicId,
      images: [{ url: imgA.url, publicId: imgA.publicId }],
      published: false,
    },
  });
  const itemId = created.body?.data?.id || created.body?.data?._id;
  check('create retail -> 201', created.status === 201 && !!itemId, `status ${created.status}`);

  const upB = await request(base, 'POST', '/api/admin/uploads', {
    headers: auth,
    multipart: multipartFile('file', 'b.jpg', TINY_JPEG, 'image/jpeg', { folder: 'retail' }),
  });
  const imgB = upB.body?.data?.images?.[0];

  const before = destroyed.length;
  const replaced = await request(base, 'PUT', `/api/admin/retail/${itemId}`, {
    headers: auth,
    body: {
      image: imgB.url,
      imagePublicId: imgB.publicId,
      images: [{ url: imgB.url, publicId: imgB.publicId }],
    },
  });
  await sleep(400);
  check(
    'R1 replace image -> old Cloudinary asset deleted',
    replaced.status === 200 && destroyed.slice(before).includes(imgA.publicId),
    `deleted=${destroyed.slice(before).join(',') || 'NONE'}`
  );
  check(
    'R2 replace image -> NEW asset NOT deleted',
    !destroyed.includes(imgB.publicId),
    `imgB publicId=${imgB.publicId}`
  );

  const beforeToggle = destroyed.length;
  const toggled = await request(base, 'PUT', `/api/admin/retail/${itemId}`, {
    headers: auth,
    body: { inStock: false, availability: false },
  });
  await sleep(400);
  check(
    'R3 stock toggle deletes no assets',
    toggled.status === 200 && destroyed.length === beforeToggle,
    `status ${toggled.status} new deletes=${destroyed.length - beforeToggle}`
  );

  const beforeDel = destroyed.length;
  const del = await request(base, 'DELETE', `/api/admin/retail/${itemId}`, { headers: auth });
  await sleep(400);
  check(
    'R4 delete product -> Cloudinary asset deleted',
    del.status === 200 && destroyed.slice(beforeDel).includes(imgB.publicId),
    `status ${del.status} deleted=${destroyed.slice(beforeDel).join(',') || 'NONE'}`
  );

  const passed = results.filter((r) => r.ok).length;
  console.log('\n' + '='.repeat(72));
  console.log(`WORK 04 RETAIL CLEANUP VERIFICATION: ${passed}/${results.length} checks passed`);
  console.log('='.repeat(72));
  for (const p of spawned) { try { p.kill('SIGTERM'); } catch {} }
  mock.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error('Harness error:', e); process.exit(1); });
