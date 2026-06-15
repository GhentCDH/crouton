import { defineConfig } from 'tsup';

import { readFile, writeFile } from 'node:fs/promises';


const outDir = '../../dist/create-crouton-app';

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
  // Bundle runtime deps so the CLI is fully self-contained (no transitive
  // dependency resolution needed by consumers that link it via `file:`).
  noExternal: ['commander'],
  // Emit a self-contained package.json into dist so the folder is both a
  // publishable unit (`npm publish ../../dist/create-crouton-app`) and a
  // valid `file:` link target for consumers.
  async onSuccess() {
    const pkg = JSON.parse(await readFile('./package.json', 'utf8'));
    const distPkg = {
      name: pkg.name,
      version: pkg.version,
      description: 'Scaffold a new crouton app',
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
