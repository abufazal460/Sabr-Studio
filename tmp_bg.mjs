import { spawn } from 'node:child_process';
const args = process.argv.slice(2);
const [cmd, ...rest] = args;
const child = spawn(cmd, rest, {
  cwd: 'C:\\\\Users\\\\fazal\\\\OneDrive\\\\Desktop\\\\SabrStudio',
  detached: true,
  stdio: 'ignore',
  shell: true,
});
child.unref();
console.log('STARTED ' + cmd + ' ' + rest.join(' '));
