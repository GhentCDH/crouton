import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 4200,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  _resolve: {
    alias: {
      // Stub out @prisma/client for frontend builds
      "@prisma/client": path.resolve(__dirname, "src/stubs/prisma-client.ts"),
      // Force local dist for linked @ghentcdh packages (bypass stale pnpm store copies)
    },
    dedupe: [
      "vue",
      "vue-router",
      "axios",
      // "uuid",
      // "zod",
      // "@jsonforms/core",
      // "@ghentcdh/tools-vue",
      // "@ghentcdh/annotated-text",
      // "@ghentcdh/ui",
    ],
  },
  optimizeDeps: {
    include: [
      "vue",
      "vue-router",
      "axios",
      "tiptap-markdown",
      // "uuid",
      // "@jsonforms/core",
      // "@ghentcdh/tools-vue",
    ],
    exclude: [
      // "@ghentcdh/annotated-text",
      // "@ghentcdh/ui",
      // "@prisma/client"
    ],
  },
});
