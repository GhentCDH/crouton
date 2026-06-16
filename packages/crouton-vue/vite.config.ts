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
  cacheDir: '../../node_modules/.vite/packages/crouton-vue',
  plugins: [
    vue(),
    tailwindcss(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
  ],
  build: {
    outDir: '../../dist/crouton-vue',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: 'src/index.ts',
      name: 'crouton-vue',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        '@ghentcdh/crouton-forms-vue',
        '@ghentcdh/ui',
        '@jsonforms/core',
        'axios',
        'lodash-es',
        'vue',
        'vue-router',
        'zod',
      ],
      output: {
        globals: { vue: 'Vue' },
        // Emit the compiled CSS as styles.css (matches the package export)
        assetFileNames: 'styles[extname]',
      },
    },
  },
});
