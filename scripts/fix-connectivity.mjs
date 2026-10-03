// Small one-shot fixer: applied via `node scripts/fix-connectivity.mjs`, then removed.
// 1) axiosClient no-response message must name the documented backend origin
//    http://localhost:3000 (proxy target 127.0.0.1 is equivalent IPv4 loopback).
// 2) vite preview must proxy /api + /health like dev, else `vite preview`
//    serves the same UI with no backend path (status 0 / Unable to connect).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const axiosPath = path.join(root, 'frontend', 'src', 'shared', 'api', 'axiosClient.js');
let axios = fs.readFileSync(axiosPath, 'utf8');
const beforeAxios = axios;
axios = axios.split('http://127.0.0.1:3000').join('http://localhost:3000');
if (axios !== beforeAxios) {
  fs.writeFileSync(axiosPath, axios);
  console.log('[fix] axiosClient no-response message -> http://localhost:3000');
} else {
  console.log('[fix] axiosClient message already consistent');
}

const vitePath = path.join(root, 'frontend', 'vite.config.js');
let vite = fs.readFileSync(vitePath, 'utf8');
if (!vite.includes('preview:') || !vite.match(/preview:\s*\{[^}]*proxy/)) {
  const previewBlock = `  preview: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    }
  }`;
  const previewRe = /  preview:\s*\{\s*host:\s*true,\s*port:\s*5173\s*\}/;
  if (previewRe.test(vite)) {
    vite = vite.replace(previewRe, previewBlock);
    fs.writeFileSync(vitePath, vite);
    console.log('[fix] vite preview proxy added (/api + /health -> 127.0.0.1:3000)');
  } else {
    console.log('[fix] vite preview block not in expected shape; skipped');
  }
} else {
  console.log('[fix] vite preview proxy already present');
}
