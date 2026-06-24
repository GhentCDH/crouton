import { defineConfig } from 'tsup';

import { readFile, writeFile } from 'node:fs/promises';


const outDir = './dist';

export default defineConfig({
  entry: ['src/index.ts'],
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
  esbuildOptions(options) {
    options.conditions = ['@ghentcdh/crouton'];
  },
  // Emit a self-contained package.json into dist so the folder is both a
  // publishable unit (`npm publish ../../dist/crouton-cli`) and a valid
  // `file:` link target for consumers (e.g. new_polities).
  async onSuccess() {
    const pkg = JSON.parse(await readFile('./package.json', 'utf8'));
    const distPkg = {
      name: pkg.name,
      version: pkg.version,
      description: 'Crouton project CLI',
      publishConfig: pkg.publishConfig,
      type: 'module',
      bin: { crouton: './index.js' },
      dependencies: pkg.dependencies ?? {},
    };
    await writeFile(
      `${outDir}/package.json`,
      `${JSON.stringify(distPkg, null, 2)}\n`,
    );
  },
});
