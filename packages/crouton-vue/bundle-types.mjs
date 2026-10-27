import { readFileSync, writeFileSync, cpSync, readdirSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');
const repoRoot = resolve(__dirname, '../..');
const uiVueDist = resolve(__dirname, 'node_modules/@ghentcdh/crouton-ui-vue/dist');

// Copy crouton-ui-vue types into crouton-vue dist so consumers get them without
// installing the package separately (crouton-ui-vue is private / not on npm)
cpSync(uiVueDist, resolve(distDir, 'crouton-ui-vue'), { recursive: true });

// Same for the private @crouton/* workspace libs. Their built declarations are
// written to the repo-level dist/libs/<name>/src by their @nx/js:tsc build.
// The generated .d.ts files reference these libs by bare specifier (resolution
// goes through the linked workspace package), so we copy the declarations in
// and rewrite those bare specifiers to relative paths.
cpSync(resolve(repoRoot, 'dist/libs/i18n/src'), resolve(distDir, 'crouton-i18n'), {
  recursive: true,
});
cpSync(resolve(repoRoot, 'dist/libs/status/src'), resolve(distDir, 'crouton-status'), {
  recursive: true,
});

// Walk every emitted .d.ts (nested declarations included, not just the entry)
// and rewrite bare imports of the private packages to relative paths pointing
// at the copied declarations.
const rewrites = {
  '@ghentcdh/crouton-ui-vue': './crouton-ui-vue/index',
  '@crouton/i18n': './crouton-i18n/index',
  '@crouton/status': './crouton-status/index',
};

const rewriteTarget = (fromDir, target) => {
  const rel = relative(fromDir, resolve(distDir, target.replace(/^\.\//, '')));
  return rel === '' ? `./${target.replace(/^\.\//, '')}` : `./${rel.replace(/\\/g, '/')}`;
};

const collectDts = (dir): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'crouton-i18n' || entry.name === 'crouton-status') continue;
      if (entry.name === 'crouton-ui-vue') continue;
      out.push(...collectDts(full));
    } else if (entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
};

for (const file of collectDts(distDir)) {
  const fromDir = dirname(file);
  const content = readFileSync(file, 'utf8');
  let patched = content;
  for (const [pkg, target] of Object.entries(rewrites)) {
    const replacement = rewriteTarget(fromDir, target);
    patched = patched.replaceAll(
      new RegExp(`(['"])${pkg.replace(/\//g, '\\/')}\\1`, 'g'),
      `'${replacement}'`,
    );
  }
  if (patched !== content) writeFileSync(file, patched);
}
