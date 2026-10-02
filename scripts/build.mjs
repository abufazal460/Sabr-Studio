// Frontend production build.
//   vite build -> frontend/dist
// The backend is API-only and no longer serves the frontend, so there is no
// copy step into backend/public. Vercel serves frontend/dist as static output;
// any other static host can serve frontend/dist directly.
// Cross-platform: uses Node APIs only (no shell cp/xcopy).
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const frontendDir = path.join(root, 'frontend');
const distDir = path.join(frontendDir, 'dist');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
  console.log('[build] Installing frontend dependencies...');
  execFileSync(npm, ['install'], { cwd: frontendDir, stdio: 'inherit', shell: true });
}

console.log('[build] Building frontend (vite build)...');
execFileSync(npm, ['run', 'build'], { cwd: frontendDir, stdio: 'inherit', shell: true });

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[build] Frontend build did not produce dist/index.html — aborting.');
  process.exit(1);
}

console.log('[build] Done. Frontend build output: frontend/dist');
