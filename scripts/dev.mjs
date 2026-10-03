// Root dev orchestrator: runs backend (:3000) + frontend (:5173) concurrently.
// Usage: npm run dev
// This file is required by root package.json ("dev": "node scripts/dev.mjs").
// Cross-platform: Node APIs only (no shell-specific syntax).
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function hasNodeModules(dir) {
  return fs.existsSync(path.join(dir, 'node_modules'));
}

if (!hasNodeModules(backendDir)) {
  console.log('[dev] Installing backend dependencies...');
  const r = spawn(npm, ['install'], { cwd: backendDir, stdio: 'inherit', shell: true });
  await new Promise((resolve, reject) => {
    r.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('backend npm install failed'))));
    r.on('error', reject);
  });
}

if (!hasNodeModules(frontendDir)) {
  console.log('[dev] Installing frontend dependencies...');
  const r = spawn(npm, ['install'], { cwd: frontendDir, stdio: 'inherit', shell: true });
  await new Promise((resolve, reject) => {
    r.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('frontend npm install failed'))));
    r.on('error', reject);
  });
}

function checkHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

const children = [];

function launch(name, args, cwd, extraEnv) {
  const child = spawn(npm, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  children.push({ name, child });
  child.on('exit', (code) => {
    console.error(`[dev] ${name} exited with code ${code}. Shutting down.`);
    shutdown(code === 0 ? 0 : 1);
  });
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
  setTimeout(() => process.exit(code), 800);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Backend first: explicit ports so backend/dev.js binds :3000 even when PORT=8080 exists.
launch('backend', ['run', 'dev'], backendDir, { PORT: '3000', BACKEND_PORT: '3000' });

// Wait for backend health before starting frontend so the Vite proxy never
// forwards into ECONNREFUSED on a cold boot.
const backendHealth = 'http://127.0.0.1:3000/api/health';
let backendReady = await checkHealth(backendHealth);
for (let i = 0; i < 40 && !backendReady; i++) {
  await new Promise((r) => setTimeout(r, 500));
  backendReady = await checkHealth(backendHealth);
}
if (backendReady) {
  console.log('[dev] Backend ready on http://localhost:3000');
} else {
  console.warn('[dev] Backend health check timed out; starting frontend anyway.');
}

launch('frontend', ['run', 'dev'], frontendDir, { PORT: '5173' });

console.log('[dev] Backend: http://localhost:3000 | Frontend: http://localhost:5173');
