import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@ghentcdh/crouton'],
  },
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
});
