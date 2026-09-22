import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = fileURLToPath(new URL('.', import.meta.url));
const resourcesDir = resolve(_dirname, '../backend/src/app/resources');

const backendResourceWatcher = (): Plugin => ({
  name: 'backend-resource-watcher',
  configureServer(server) {
    server.watcher.add(resourcesDir);
    server.watcher.on('change', (file) => {
      if (file.startsWith(resourcesDir) && file.endsWith('.json')) {
        setTimeout(() => server.ws.send({ type: 'full-reload' }), 1500);
      }
    });
  },
});

export default defineConfig({
  plugins: [vue(), tailwindcss(), backendResourceWatcher()],
  resolve: {
    conditions: ['@ghentcdh/crouton'],
    dedupe: ['vue', 'vue-router'],
  },
  server: {
    port: 4300,
    proxy: {
      '/api': {
        target: 'http://localhost:4444',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: 4300,
  },
});
