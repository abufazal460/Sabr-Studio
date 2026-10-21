// Root dev orchestrator: runs backend (:3000) + frontend (:5173) concurrently.
// Usage: npm run dev
// This file is required by root package.json ("dev": "node scripts/dev.mjs").
// Cross-platform: Node APIs only (no shell-specific syntax).
import { spawn, spawnSync } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const isWin = process.platform === 'win32';
const npmBin = isWin ? 'npm.cmd' : 'npm';

// On Windows npm only ships as npm.cmd, and spawning a .cmd requires
// `shell: true` — which makes Node concatenate argv into one command line
// (DEP0190, and a genuine injection foot-gun). Node's bundled npm-cli.js is an
// actual file, so run it with the current Node binary and keep args as an argv
// array. The shell form remains a fallback for installs where npm lives
// elsewhere (pnpm/corepack-managed Node).
function resolveNpmCli() {
  const nodeDir = path.dirname(process.execPath);
  return [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDir, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].find((p) => fs.existsSync(p)) || null;
}
const npmCli = resolveNpmCli();

function spawnNpm(args, opts) {
  return npmCli
    ? spawn(process.execPath, [npmCli, ...args], { ...opts, shell: false })
    : spawn(npmBin, args, { ...opts, shell: true });
}

// `npm run` nests children (npm -> cmd -> nodemon -> node), so child.kill()
// would reap only the outermost process and leave the dev servers orphaned on
// their ports. Terminate the whole tree instead.
function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (isWin) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    try {
      child.kill('SIGTERM');
    } catch {}
  }
}

function hasNodeModules(dir) {
  return fs.existsSync(path.join(dir, 'node_modules'));
}

if (!hasNodeModules(backendDir)) {
  console.log('[dev] Installing backend dependencies...');
  const r = spawnNpm(['install'], { cwd: backendDir, stdio: 'inherit' });
  await new Promise((resolve, reject) => {
    r.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('backend npm install failed'))));
    r.on('error', reject);
  });
}

if (!hasNodeModules(frontendDir)) {
  console.log('[dev] Installing frontend dependencies...');
  const r = spawnNpm(['install'], { cwd: frontendDir, stdio: 'inherit' });
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
  const child = spawnNpm(args, {
    cwd,
    stdio: 'inherit',
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
  for (const { child } of children) killTree(child);
  setTimeout(() => process.exit(code), 1000);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Backend first: BACKEND_PORT pins :3000 (backend/dev.js ignores the deployment
// PORT on purpose, so the Vite /api proxy target always matches).
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
