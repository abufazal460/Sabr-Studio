import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite's import.meta.env is injected into client/browser code only. It is
// undefined when this config module is parsed by Node (the cause of the
// Hostinger build failure: "Cannot read properties of undefined (reading
// 'VITE_API_BASE_URL')"). Read config-time variables through Vite's own
// loadEnv() instead, which merges the .env files and never throws on missing
// keys. VITE_* variables are read here, never in client code.
const env = loadEnv(
  process.env.MODE || process.env.NODE_ENV || 'development',
  __dirname,
  'VITE_',
);

// VITE_API_BASE_URL is a *client* base URL (relative "/api" in same-origin
// deployments). It must never be used as the dev-server proxy target, because
// a relative value cannot be a proxy target and the proxy must forward /api
// to the local backend. Only an absolute URL (e.g. a separate backend
// subdomain) is meaningful here; otherwise fall back to the local backend.
const apiProxyTarget =
  env.VITE_API_BASE_URL &&
  (env.VITE_API_BASE_URL.startsWith('http://') ||
    env.VITE_API_BASE_URL.startsWith('https://'))
    ? env.VITE_API_BASE_URL
    : 'http://127.0.0.1:3000';

export default defineConfig({
  root: path.resolve(__dirname, '.'),

  plugins: [
    react()
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,

    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom'
          ],

          'vendor-framer': [
            'framer-motion'
          ],

          'vendor-lenis': [
            'lenis'
          ],

          'vendor-icons': [
            'react-icons'
          ]
        }
      }
    }
  },

  server: {
    // Bind dual-stack (IPv4 + IPv6). `localhost` on Windows can resolve to `::1`
    // first; an IPv4-only bind (`0.0.0.0`) makes those browser connections get
    // ERR_CONNECTION_REFUSED, which surfaces as an intermittent "Unable to connect
    // to backend server" on /projects, /retail and admin login.
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[Vite Proxy] Backend connection failed at http://127.0.0.1:3000:', err.message);
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: 'Backend server is unreachable on port 3000. Please ensure the backend is running with "npm run dev:backend".',
                code: 'BACKEND_UNAVAILABLE'
              }));
            }
          });
        },
      },
      '/health': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[Vite Proxy] Backend connection failed at http://127.0.0.1:3000:', err.message);
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: 'Backend server is unreachable on port 3000. Please ensure the backend is running with "npm run dev:backend".',
                code: 'BACKEND_UNAVAILABLE'
              }));
            }
          });
        },
      },
    },
  },

  preview: {
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
  }
});