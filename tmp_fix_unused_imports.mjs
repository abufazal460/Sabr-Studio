import * as fs from 'fs';
const results = JSON.parse(fs.readFileSync('C:/Users/fazal/OneDrive/Desktop/SabrStudio/frontend_eslint.json', 'utf8'));

const perFile = new Map();
for (const r of results) {
  for (const m of r.messages) {
    if (m.ruleId !== 'no-unused-vars') continue;
    const match = m.message.match(/^'([^']+)' is defined but never used\.$/);
    if (!match) continue;
    if (!perFile.has(r.filePath)) perFile.set(r.filePath, []);
    perFile.get(r.filePath).push(match[1]);
  }
}

let removedLines = 0;
let editedNamed = 0;
const skipped = [];
for (const [file, names] of perFile) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out = [];
  for (const line of lines) {
    let cur = line;
    let drop = false;
    for (const name of names) {
      const defaultRe = new RegExp('^import ' + name + " from '[^']+';\\s*$");
      if (defaultRe.test(cur)) {
        drop = true;
        break;
      }
      if (/^import\s*\{[^}]*\}\s*from/.test(cur) && cur.includes(name)) {
        const before = cur;
        cur = cur
          .replace(/\{([^}]*)\}/, (inner) => {
            const parts = inner[1]
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .filter((s) => s.split(/\s+as\s+/)[0].trim() !== name);
            return '{ ' + parts.join(', ') + ' }';
          })
          .replace(/import\s*\{\s*\}\s*from/, '// (all specifiers removed) import from');
        if (cur !== before) {
          if (/^\/\/ \(all specifiers removed\)/.test(cur)) {
            drop = true;
          } else {
            editedNamed++;
          }
          break;
        }
      }
    }
    if (drop) {
      removedLines++;
      continue;
    }
    out.push(cur);
  }
  const leftover = names.filter((n) => !out.join('\n').includes(n));
  if (leftover.length) skipped.push(file + ': ' + leftover.join(','));
  fs.writeFileSync(file, out.join('\n'), 'utf8');
}
console.log('LINES_REMOVED=' + removedLines + ' NAMED_EDITED=' + editedNamed);
if (skipped.length) console.log('SKIPPED_MANUAL:\n' + skipped.join('\n'));
