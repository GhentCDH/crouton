import { readFileSync, writeFileSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');
const uiVueDist = resolve(__dirname, 'node_modules/@ghentcdh/crouton-ui-vue/dist');

// Copy crouton-ui-vue types into crouton-vue dist so consumers get them without
// installing the package separately (crouton-ui-vue is private / not on npm)
cpSync(uiVueDist, resolve(distDir, 'crouton-ui-vue'), { recursive: true });

// Patch the generated index.d.ts: replace the package re-export with a
// relative path pointing to the copied types
const indexPath = resolve(distDir, 'index.d.ts');
const content = readFileSync(indexPath, 'utf8');
const patched = content.replace(
  /(['"])@ghentcdh\/crouton-ui-vue\1/g,
  "'./crouton-ui-vue/index'",
);
writeFileSync(indexPath, patched);
