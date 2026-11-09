import { defineConfig } from 'tsup';

import { readFile, writeFile } from 'node:fs/promises';


const outDir = './dist';

const sharedEsbuildOptions = (options: { conditions?: string[] }) => {
  options.conditions = ['@ghentcdh/crouton'];
};

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/create-datasource/index.ts'],
    outDir,
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    // Shebang + a createRequire shim so bundled CJS deps (commander) that
    // `require()` Node built-ins work in the ESM output.
    banner: {
      js: [
        '#!/usr/bin/env node',
        'import { createRequire as __createRequire } from \'module\';',
        'const require = __createRequire(import.meta.url);',
      ].join('\n'),
    },
    // Bundle runtime deps so the CLI is self-contained for `file:` consumers.
    // `@prisma/internals` is the one exception: it is huge, imported lazily by
    // the codegen engine, and stays a real runtime dependency (declared in the
    // emitted dist package.json) so it resolves from the installed package.
    noExternal: ['commander', '@clack/prompts', 'picocolors', '@ghentcdh/crouton-codegen'],
    external: ['@prisma/internals'],
    // Resolve workspace `@ghentcdh/*` packages to their TS source (their dist
    // `exports` point at the root `dist/` with paths esbuild rejects). Mirrors
    // how crouton-api bundles crouton-core.
    esbuildOptions: sharedEsbuildOptions,
    // Emit a self-contained package.json into dist so the folder is both a
    // publishable unit (`npm publish ../../dist/crouton-cli`) and a valid
    // `file:` link target for consumers (e.g. new_polities).
    async onSuccess() {
      const pkg = JSON.parse(await readFile('./package.json', 'utf8'));
      const distPkg = {
        name: pkg.name,
        version: pkg.version,
        description: 'Crouton project CLI',
        repository: pkg.repository,
        publishConfig: pkg.publishConfig,
        type: 'module',
        bin: { crouton: 'index.js' },
        dependencies: pkg.dependencies ?? {},
      };
      await writeFile(
        `${outDir}/package.json`,
        `${JSON.stringify(distPkg, null, 2)}\n`,
      );
    },
  },
  {
    // Nx migration factories — built separately to avoid the CLI shebang banner.
    // @nx/devkit is external: it resolves from the user's installed nx.
    entry: { 'migrations/migrate-resource-v1-to-v2': 'src/migrations/migrate-resource-v1-to-v2.ts' },
    outDir,
    format: ['esm'],
    dts: false,
    splitting: false,
    clean: false,
    noExternal: ['@ghentcdh/crouton-core'],
    external: ['@nx/devkit'],
    esbuildOptions: sharedEsbuildOptions,
  },
]);
