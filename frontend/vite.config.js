import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function autoStartBackendPlugin() {
  // Safety net only: the documented flow is `npm run dev` (scripts/dev.mjs)
  // or two terminals (backend `npm run dev` + frontend `npm run dev`).
  // This plugin must NEVER spawn a duplicate backend while the real one is
  // still cold-booting (that second process would fight for :3000 and cause
  // EADDRINUSE / ECONNREFUSED flapping). So: poll health first, spawn at most
  // once, and only when the backend is genuinely absent.
  let spawned = false;
  return {
    name: 'auto-start-backend',
    configureServer() {
      const check = (attempt = 0) => {
        const req = http.get('http://127.0.0.1:3000/api/health', (res) => {
          res.resume();
          if (res.statusCode === 200) {
            console.log('\x1b[32m[Sabr Studio] Backend API is connected at http://127.0.0.1:3000\x1b[0m');
          }
        });
        req.on('error', () => {
          // Backend still cold-booting (e.g. `npm run dev` started both at
          // once)? Give it time instead of spawning a duplicate.
          if (attempt < 6) {
            setTimeout(() => check(attempt + 1), 1000);
            return;
          }
          if (spawned) return;
          spawned = true;
          console.log('\x1b[33m[Sabr Studio] Backend not detected on port 3000 after retries. Auto-starting backend... (preferred: run backend separately with "npm --prefix backend run dev")\x1b[0m');
          const rootDir = path.resolve(__dirname, '..');
          const backendProcess = spawn('node', ['backend/dev.js'], {
            cwd: rootDir,
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, PORT: '3000', BACKEND_PORT: '3000' },
          });

          const cleanup = () => {
            try { backendProcess.kill('SIGTERM'); } catch {}
          };
          process.on('exit', cleanup);
          process.on('SIGINT', cleanup);
          process.on('SIGTERM', cleanup);
        });
        req.setTimeout(3000, () => req.destroy());
      };

      setTimeout(() => check(0), 800);
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname, '.'),

  plugins: [
    react(),
    autoStartBackendPlugin()
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

          'vendor-animation': [
            'framer-motion',
            'gsap',
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