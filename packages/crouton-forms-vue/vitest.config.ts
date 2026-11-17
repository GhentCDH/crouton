import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { playwright } from '@vitest/browser-playwright';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

const source = '@ghentcdh/crouton';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/forms/renderers/controls/**'],
      exclude: ['**/__tests__/**', '**/*.spec.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
    projects: [
      {
        // Node tests resolve through Vite's SSR conditions; add `source` so
        // workspace packages load from src, not a (possibly stale) dist.
        ssr: { resolve: { conditions: [source, ...defaultServerConditions] } },
        plugins: [vue()],
        test: {
          name: 'node',
          globals: true,
          include: ['src/**/*.{test,spec}.ts'],
          exclude: ['src/**/*.browser.spec.ts'],
        },
      },
      {
        // Control renderers mounted in real Chromium — no app server needed.
        // Keep Vite's client conditions, otherwise part of the graph loads Vue's cjs build.
        resolve: { conditions: [source, ...defaultClientConditions] },
        plugins: [vue(), tailwindcss()],
        test: {
          name: 'browser',
          include: ['src/**/*.browser.spec.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 800, height: 600 },
          },
        },
      },
    ],
  },
});
