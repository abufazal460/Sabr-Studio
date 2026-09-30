// Cross-platform development launcher: runs the Express API (backend) and the
// Vite dev server (frontend) together. No external process-manager dependency.
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Ensure child dependencies exist before starting
const backendModules = path.join(root, 'backend', 'node_modules');
const frontendModules = path.join(root, 'frontend', 'node_modules');

if (!fs.existsSync(backendModules)) {
  console.log('[dev] Installing backend dependencies...');
  execFileSync(npm, ['--prefix', 'backend', 'install'], { cwd: root, stdio: 'inherit', shell: true });
}
if (!fs.existsSync(frontendModules)) {
  console.log('[dev] Installing frontend dependencies...');
  execFileSync(npm, ['--prefix', 'frontend', 'install'], { cwd: root, stdio: 'inherit', shell: true });
}

const targets = [
  { name: 'api', color: '\x1b[36m', args: ['--prefix', 'backend', 'run', 'dev'], env: { PORT: '3000' } },
  { name: 'web', color: '\x1b[35m', args: ['--prefix', 'frontend', 'run', 'dev'], env: { PORT: '5173' } },
];

const reset = '\x1b[0m';
const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child && !child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

for (const t of targets) {
  const child = spawn(npm, t.args, {
    cwd: root,
    shell: true,
    env: { ...process.env, ...t.env },
  });
  children.push(child);

  child.stdout.on('data', (d) => {
    process.stdout.write(`${t.color}[${t.name}]${reset} ${d}`);
  });
  child.stderr.on('data', (d) => {
    process.stderr.write(`${t.color}[${t.name}]${reset} ${d}`);
  });
  child.on('exit', (code) => {
    if (!shuttingDown) {
      process.stdout.write(`${t.color}[${t.name}]${reset} exited with code ${code}\n`);
      shutdown(code ?? 0);
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
