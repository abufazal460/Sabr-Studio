// Verify backup files are readable + EJSON-parseable. Prints counts only.
import fs from "node:fs";
import path from "node:path";
import { EJSON } from "../backend/node_modules/bson/lib/bson.mjs";

const dirs = fs.readdirSync(path.join("backend", "data")).filter(d => d.startsWith("backup-")).sort();
if (!dirs.length) { console.error("No backup dirs found"); process.exit(1); }
const latest = dirs[dirs.length - 1];
const dir = path.join("backend", "data", latest);
console.log(`Verifying backup dir: ${dir}`);
const files = fs.readdirSync(dir).filter(f => f.endsWith(".ejson"));
let total = 0;
for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), "utf-8");
  const docs = EJSON.parse(raw);
  console.log(`  ${f}: ${docs.length} docs, parse=OK`);
  total += docs.length;
}
console.log(`BACKUP VERIFIED: ${files.length} files, ${total} total docs (no values printed)`);
