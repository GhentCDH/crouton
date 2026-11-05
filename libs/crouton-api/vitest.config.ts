import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

import { resolve } from 'node:path';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    // crouton-codegen has an invalid exports path (../../dist/...) that vite
    // rejects. Alias it to its source entry so tests can import CroutonApiModule
    // without requiring a prior codegen build.
    alias: {
      '@ghentcdh/crouton-codegen': resolve(
        import.meta.dirname,
        '../../packages/crouton-codegen/src/index.ts',
      ),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});
