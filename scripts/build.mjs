// Production build for persistent Node hosting (Hostinger) and local prod tests.
//   1. Build the Vite frontend  -> frontend/dist
//   2. Copy that build into      -> backend/public  (served by Express)
// Cross-platform: uses Node APIs only (no shell cp/xcopy).
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const frontendDir = path.join(root, 'frontend');
const distDir = path.join(frontendDir, 'dist');
const publicDir = path.join(root, 'backend', 'public');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('[build] Building frontend (vite build)...');
execFileSync(npm, ['run', 'build'], { cwd: frontendDir, stdio: 'inherit', shell: true });

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[build] Frontend build did not produce dist/index.html — aborting.');
  process.exit(1);
}

console.log('[build] Preparing backend/public...');
fs.mkdirSync(publicDir, { recursive: true });

// Clear previous build output but keep the tracked .gitkeep placeholder.
for (const entry of fs.readdirSync(publicDir)) {
  if (entry === '.gitkeep') continue;
  fs.rmSync(path.join(publicDir, entry), { recursive: true, force: true });
}

fs.cpSync(distDir, publicDir, { recursive: true });

// Ensure the placeholder always exists so the directory stays tracked by git.
const gitkeep = path.join(publicDir, '.gitkeep');
if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '');

console.log('[build] Done. Frontend build copied to backend/public.');
console.log('[build] Start the production server with: npm run start');
