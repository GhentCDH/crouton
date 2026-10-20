#!/usr/bin/env node
// Report-only: prints exported names defined in more than one package. Exits 0.
// Pass --fail to exit 1 when duplicates exist (for CI enforcement, PR 10).

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const rootDir = new URL('..', import.meta.url).pathname;
const packagesDir = join(rootDir, 'packages');
const FAIL_MODE = process.argv.includes('--fail');

// ponytail: O(files) scan, no incremental cache — fast enough for ~200 source files
const collectExports = async (pkgName, srcDir) => {
  const exports = new Map(); // name -> [file, ...]
  const walk = async (dir) => {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(e.name) || e.name.endsWith('.d.ts') || e.name.endsWith('.spec.ts') || e.name.endsWith('.test.ts')) continue;
      const text = await readFile(full, 'utf8');
      const rel = relative(rootDir, full);
      for (const m of text.matchAll(/^export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/gm)) {
        const name = m[1];
        if (!exports.has(name)) exports.set(name, []);
        exports.get(name).push(rel);
      }
      // export { Foo, Bar } from '...' — re-exports
      for (const m of text.matchAll(/^export\s*\{([^}]+)\}/gm)) {
        for (const part of m[1].split(',')) {
          const name = (part.split(' as ').pop() ?? '').trim();
          if (!name || name === '*') continue;
          if (!exports.has(name)) exports.set(name, []);
          exports.get(name).push(rel);
        }
      }
    }
  };
  await walk(srcDir);
  return exports;
};

const pkgDirs = (await readdir(packagesDir, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// name -> [{pkg, files}]
const allExports = new Map();
for (const pkg of pkgDirs) {
  const srcDir = join(packagesDir, pkg, 'src');
  const map = await collectExports(pkg, srcDir);
  for (const [name, files] of map) {
    if (!allExports.has(name)) allExports.set(name, []);
    allExports.get(name).push({ pkg, files });
  }
}

const duplicates = [...allExports.entries()]
  .filter(([, entries]) => entries.length > 1)
  .sort(([a], [b]) => a.localeCompare(b));

if (!duplicates.length) {
  console.log('No duplicate exports found.');
  process.exit(0);
}

console.log(`\nDuplicate exports (${duplicates.length} names):\n`);
console.log('| Name | Packages |');
console.log('|------|----------|');
for (const [name, entries] of duplicates) {
  const pkgs = entries.map((e) => e.pkg).join(', ');
  console.log(`| ${name} | ${pkgs} |`);
}
console.log(`\nTotal: ${duplicates.length} duplicated names across ${pkgDirs.length} packages.\n`);

if (FAIL_MODE) {
  process.exit(1);
}
