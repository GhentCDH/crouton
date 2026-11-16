import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      '**/vite.config.{mjs,js,ts,mts}',
      '**/vitest.config.{mjs,js,ts,mts}',
      '!vitest.config.{mjs,js,ts,mts}',
      '!vite.config.{mjs,js,ts,mts}',
      // Build-only config; its tests run from vitest.config.ts next to it.
      // Listing both registers two projects with the same name.
      '!packages/crouton-forms-vue/vite.config.ts',
    ],
  },
});
