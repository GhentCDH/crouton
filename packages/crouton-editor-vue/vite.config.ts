/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import * as path from 'path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/crouton-editor-vue',
  plugins: [
    vue(),
    tailwindcss(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
      rollupTypes: true,
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: {
        index: 'src/index.ts',
      },
      name: 'crouton-editor-vue',
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ['es'],
    },
    rolldownOptions: {
      external: [
        '@ghentcdh/crouton-forms-vue',
        '@ghentcdh/ui',
        'vue',
        'zod',
      ],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
});
