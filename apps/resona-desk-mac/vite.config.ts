import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import http from 'http';
import { spawn, ChildProcess } from 'child_process';

function backendAutoSpawnPlugin(): Plugin {
  let backendProc: ChildProcess | null = null;

  return {
    name: 'backend-autospawn-plugin',
    configureServer(server) {
      // Check if backend 3188 is alive
      const req = http.get('http://127.0.0.1:3188/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('>> [Vite] Backend engine is already running on http://127.0.0.1:3188');
        }
      });

      req.on('error', () => {
        console.log('>> [Vite] Auto-spawning ResonaDesk backend engine on http://127.0.0.1:3188...');
        const serverScript = path.resolve(__dirname, 'server.mjs');
        backendProc = spawn('node', [serverScript], {
          env: { ...process.env, PORT: '3188' },
          stdio: 'inherit',
        });
      });

      // Cleanup on server exit
      const clean = () => {
        if (backendProc) {
          try { backendProc.kill(); } catch (e) {}
        }
      };
      process.on('exit', clean);
      process.on('SIGINT', () => { clean(); process.exit(0); });
      process.on('SIGTERM', () => { clean(); process.exit(0); });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), backendAutoSpawnPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5188,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3188',
        changeOrigin: true,
      },
    },
  },
});
