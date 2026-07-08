import { defineConfig } from 'tsup';

import { readFile, writeFile } from 'node:fs/promises';

const outDir = '../../dist/add-crouton';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir,
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: [
      '#!/usr/bin/env node',
      'import { createRequire as __createRequire } from \'module\';',
      'const require = __createRequire(import.meta.url);',
    ].join('\n'),
  },
  noExternal: ['commander', '@clack/prompts', 'picocolors', '@ghentcdh/crouton-codegen', 'create-crouton'],
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
  async onSuccess() {
    const pkg = JSON.parse(await readFile('./package.json', 'utf8'));
    const distPkg = {
      name: pkg.name,
      version: pkg.version,
      description: 'Add crouton to an existing project',
      type: 'module',
      bin: Object.fromEntries(
        Object.keys(pkg.bin ?? {}).map((name) => [name, './index.js']),
      ),
    };
    await writeFile(
      `${outDir}/package.json`,
      `${JSON.stringify(distPkg, null, 2)}\n`,
    );
  },
});
