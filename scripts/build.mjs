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
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Same reason as scripts/dev.mjs: on Windows npm is only npm.cmd, so args would
// have to go through a shell and get concatenated (DEP0190). Node's bundled
// npm-cli.js is a real file, so argv can stay an array.
const npmCli = [
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  path.join(path.dirname(process.execPath), 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
].find((p) => fs.existsSync(p)) || null;

function runNpm(args, opts) {
  return npmCli
    ? execFileSync(process.execPath, [npmCli, ...args], { ...opts, shell: false })
    : execFileSync(npmBin, args, { ...opts, shell: true });
}

// Vite lives in devDependencies. Hosts such as Hostinger run the build with
// NODE_ENV=production, and npm then omits devDependencies, so `vite` is missing
// and `npm run build` fails with "sh: line 1: vite: command not found".
// frontend/.npmrc sets `include=dev` so a plain install still brings Vite in;
// --include=dev is passed explicitly here too, so the build is correct even if
// the host overrides that with `--omit=dev`.
const viteBin = process.platform === 'win32'
  ? path.join(frontendDir, 'node_modules', '.bin', 'vite.cmd')
  : path.join(frontendDir, 'node_modules', '.bin', 'vite');

if (!fs.existsSync(viteBin)) {
  console.log('[build] Vite not found — installing frontend dependencies (including devDependencies)...');
  runNpm(['install', '--include=dev'], { cwd: frontendDir, stdio: 'inherit' });
}

if (!fs.existsSync(viteBin)) {
  console.error('[build] Vite is still unavailable after install — cannot build frontend.');
  process.exit(1);
}

console.log('[build] Building frontend (vite build)...');
runNpm(['run', 'build'], { cwd: frontendDir, stdio: 'inherit' });

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[build] Frontend build did not produce dist/index.html — aborting.');
  process.exit(1);
}

console.log('[build] Done. Frontend build output: frontend/dist');
