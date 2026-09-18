import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    conditions: ['@ghentcdh/crouton'],
    dedupe: ['vue', 'vue-router'],
  },
  server: {
    port: 5555,
    proxy: {
      '/api': {
        target: 'http://localhost:4444',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: 5555,
  },
});
