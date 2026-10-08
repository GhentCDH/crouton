#!/usr/bin/env node
// Usage: node tools/agent-eval/verify.mjs <task-name> [--cwd <app-dir>]
// Runs the verify script for the given task name and reports results.

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const cwdIdx = args.indexOf('--cwd');
const cwd = cwdIdx !== -1 ? resolve(args[cwdIdx + 1]) : process.cwd();
const taskArg = args.find((a) => !a.startsWith('--') && a !== args[cwdIdx + 1]);

if (!taskArg) {
  console.error('Usage: node verify.mjs <task-name> [--cwd <app-dir>]');
  process.exit(1);
}

const taskName = taskArg.replace(/^tasks\//, '').replace(/\.md$/, '');
const verifyScript = resolve(__dirname, 'verify', `verify-${taskName}.mjs`);

if (!existsSync(verifyScript)) {
  console.error(`No verify script found: ${verifyScript}`);
  process.exit(1);
}

const start = Date.now();
const result = spawnSync('node', [verifyScript, '--cwd', cwd], { stdio: 'inherit', encoding: 'utf-8' });
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

if (result.status === 0) {
  console.log(`\nPASS  ${taskName}  (${elapsed}s)`);
  process.exit(0);
} else {
  console.error(`\nFAIL  ${taskName}  (${elapsed}s)`);
  process.exit(1);
}
