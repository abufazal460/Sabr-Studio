// Single-server local workflow: build the React frontend once, then serve the
// compiled assets plus every API route from one Express process on port 3000.
// Usage: `npm run serve` (repo root) or `npm run serve` (backend/).
// This replaces workflows that exposed the frontend and backend as separate
// servers/ports. Vite HMR remains separately available through the legacy
// dual-process `dev:hmr` alias when live frontend editing is required.
import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distIndex = path.join(root, 'frontend', 'dist', 'index.html');
const publicIndex = path.join(root, 'backend', 'public', 'index.html');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!fs.existsSync(distIndex) || !fs.existsSync(publicIndex)) {
  console.log('[serve] Building current frontend for backend/public...');
  execFileSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
} else {
  console.log('[serve] Reusing current frontend build in backend/public.');
}

console.log('[serve] Starting single-server Express app at http://localhost:3000');
const child = spawn(npm, ['--prefix', 'backend', 'run', 'start'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
