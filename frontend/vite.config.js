import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function autoStartBackendPlugin() {
  return {
    name: 'auto-start-backend',
    configureServer() {
      const check = () => {
        const req = http.get('http://127.0.0.1:3000/api/health', (res) => {
          if (res.statusCode === 200) {
            console.log('\x1b[32m[Sabr Studio] Backend API is connected at http://127.0.0.1:3000\x1b[0m');
          }
        });
        req.on('error', () => {
          console.log('\x1b[33m[Sabr Studio] Backend not detected on port 3000. Auto-starting backend...\x1b[0m');
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
      };

      setTimeout(check, 800);
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
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
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
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 5173
  }
});