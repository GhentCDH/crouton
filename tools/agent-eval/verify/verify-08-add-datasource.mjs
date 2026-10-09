#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const args = process.argv.slice(2);
const cwdIdx = args.indexOf('--cwd');
const cwd = cwdIdx !== -1 ? resolve(args[cwdIdx + 1]) : process.cwd();

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

const datasourcePath = resolve(cwd, 'src/data-sources/external-api/datasource.json');
if (!existsSync(datasourcePath)) fail(`datasource.json not found at ${datasourcePath}`);

let datasource;
try {
  datasource = JSON.parse(readFileSync(datasourcePath, 'utf-8'));
} catch (e) {
  fail(`datasource.json is not valid JSON: ${e.message}`);
}

if (!datasource.name) fail('datasource.json missing "name" field');
if (!datasource.adapter) fail('datasource.json missing "adapter" field');

const adapterPath = resolve(cwd, 'src/data-sources/external-api/adapter.ts');
if (!existsSync(adapterPath)) fail(`adapter.ts not found at ${adapterPath}`);

try {
  execSync('pnpm crouton validate', { cwd, stdio: 'pipe' });
} catch (e) {
  fail(`crouton validate failed:\n${e.stderr?.toString() ?? e.message}`);
}

console.log('OK: external-api datasource and adapter stub exist');
