#!/usr/bin/env node
import { readdirSync, existsSync } from 'fs';
import { resolve, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tasksDir = resolve(__dirname, 'tasks');
const verifyDir = resolve(__dirname, 'verify');

const taskFiles = readdirSync(tasksDir).filter((f) => f.endsWith('.md'));
const missing = [];

for (const task of taskFiles) {
  const name = basename(task, '.md');
  const verifyScript = resolve(verifyDir, `verify-${name}.mjs`);
  if (!existsSync(verifyScript)) missing.push(`verify/verify-${name}.mjs`);
}

if (missing.length > 0) {
  console.error('Missing verify scripts:');
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

console.log(`OK: all ${taskFiles.length} tasks have paired verify scripts`);
