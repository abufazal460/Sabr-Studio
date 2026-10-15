import * as fs from 'fs';
const results = JSON.parse(fs.readFileSync('C:/Users/fazal/OneDrive/Desktop/SabrStudio/frontend_eslint.json', 'utf8'));
let errors = 0;
let warnings = 0;
for (const r of results) {
  const errs = r.messages.filter((m) => m.severity === 2);
  const warns = r.messages.filter((m) => m.severity === 1);
  errors += errs.length;
  warnings += warns.length;
  if (errs.length) {
    console.log('FILE ' + r.filePath.replace(/.*SabrStudio./, ''));
    for (const e of errs) {
      console.log('  ' + e.line + ':' + e.column + ' ' + e.ruleId + ' — ' + e.message);
    }
  }
}
console.log('TOTAL errors=' + errors + ' warnings=' + warnings);
