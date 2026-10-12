import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Secret-hygiene gate: scans TRACKED repo files for credential-shaped values.
// Prints file + line only (never matched content). Exit 1 on any hit.
// `--examples-only` restricts the scan to example/template/doc files — the
// ones most likely to receive a pasted secret by accident.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const examplesOnly = process.argv.includes('--examples-only');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);
const SCAN_EXT = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.example', '.sample', '.md', '.yml', '.yaml'];

const PATTERNS = [
  { name: 'mongodb-uri-with-creds', re: /mongodb(\+srv)?:\/\/[^/\s'"]+:[^/\s'"]+@/i },
  { name: 'razorpay-live-key', re: /rzp_(live|test)_[A-Za-z0-9]{8,}/ },
  { name: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'jwt-like', re: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
  { name: 'private-key-block', re: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
  { name: 'assigned-secret-value', re: /^\s*(JWT_SECRET|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|TWILIO_AUTH_TOKEN|CLOUDINARY_API_SECRET|EMAILJS_PRIVATE_KEY|ADMIN_PASSWORD)\s*=\s*\S+\s*$/m },
];

function trackedFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); continue; }
      const rel = path.relative(root, p).replace(/\\/g, '/');
      if (rel.endsWith('.env')) continue; // real .env files are git-ignored; scan examples only
      if (!SCAN_EXT.some((x) => rel.endsWith(x))) continue;
      out.push(p);
    }
  };
  walk(root);
  return out;
}

let hits = 0;
for (const f of trackedFiles()) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const isExample = /\.env\.example$|\.example$|\.sample$|\.md$|example\.env$/i.test(rel);
  if (examplesOnly && !isExample) continue;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { name, re } of PATTERNS) {
      if (re.test(line)) {
        console.log(`LEAK-HIT [${name}] ${rel}:${i + 1}`);
        hits += 1;
        break;
      }
    }
  });
}
console.log(hits ? `[leak-check] FAIL: ${hits} hit(s)` : '[leak-check] PASS: no credential-shaped values in scanned files');
process.exit(hits ? 1 : 0);
