#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { glob } from 'fs/promises';

const args = process.argv.slice(2);
const cwdIdx = args.indexOf('--cwd');
const cwd = cwdIdx !== -1 ? resolve(args[cwdIdx + 1]) : process.cwd();

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

const resourcePath = resolve(cwd, 'src/resources/book/resource.json');
if (!existsSync(resourcePath)) fail(`resource.json not found at ${resourcePath}`);

let resource;
try {
  resource = JSON.parse(readFileSync(resourcePath, 'utf-8'));
} catch (e) {
  fail(`resource.json is not valid JSON: ${e.message}`);
}

const cols = resource.columns ?? {};
const ratingCol = cols.rating;
if (!ratingCol) fail('Missing columns.rating on book resource');

const fi = ratingCol.fieldInput;
if (!fi) fail('columns.rating missing fieldInput');
if (!fi.type) fail('columns.rating fieldInput.type is missing');
if (fi.type !== 'star-rating') fail(`columns.rating fieldInput.type must be "star-rating", got "${fi.type}"`);

// Check config file registers the component — search common config file patterns
const configCandidates = [
  'src/crouton.config.ts',
  'src/main.ts',
  'src/plugin.ts',
  'vite.config.ts',
  'src/app.ts',
];
let registered = false;
for (const candidate of configCandidates) {
  const p = resolve(cwd, candidate);
  if (!existsSync(p)) continue;
  const content = readFileSync(p, 'utf-8');
  if (/star-rating/.test(content) && /StarRating/.test(content)) {
    registered = true;
    break;
  }
}
if (!registered) fail('Could not find "star-rating" registration with StarRating component in config files (checked: ' + configCandidates.join(', ') + ')');

try {
  execSync('pnpm crouton validate', { cwd, stdio: 'pipe' });
} catch (e) {
  fail(`crouton validate failed:\n${e.stderr?.toString() ?? e.message}`);
}

console.log('OK: star-rating custom field input is registered and used in book resource');
