import * as fs from 'fs';
const results = JSON.parse(fs.readFileSync('C:/Users/fazal/OneDrive/Desktop/SabrStudio/frontend_eslint.json', 'utf8'));

const targets = [];
for (const r of results) {
  const reactUnused = r.messages.some(
    (m) => m.ruleId === 'no-unused-vars' && m.message === "'React' is defined but never used.",
  );
  if (reactUnused) targets.push(r.filePath);
}

let changed = 0;
for (const file of targets) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const out = [];
  let removed = false;
  for (const line of lines) {
    if (/^import React from 'react';\s*$/.test(line)) {
      removed = true;
      continue;
    }
    if (/^import React, \{[^}]*\} from 'react';\s*$/.test(line)) {
      out.push(line.replace(/^import React, /, 'import '));
      removed = true;
      continue;
    }
    out.push(line);
  }
  if (removed) {
    fs.writeFileSync(file, out.join('\n'), 'utf8');
    changed++;
  }
}
console.log('REACT_IMPORTS_REMOVED_FROM=' + changed + '/' + targets.length);
