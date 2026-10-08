#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const args = process.argv.slice(2);
const cwdIdx = args.indexOf('--cwd');
const cwd = cwdIdx !== -1 ? resolve(args[cwdIdx + 1]) : process.cwd();

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

const resourcePath = resolve(cwd, 'src/resources/app-settings/resource.json');
if (!existsSync(resourcePath)) fail(`resource.json not found at ${resourcePath}`);

let resource;
try {
  resource = JSON.parse(readFileSync(resourcePath, 'utf-8'));
} catch (e) {
  fail(`resource.json is not valid JSON: ${e.message}`);
}

if (!resource.$schema) fail('Missing $schema');
if (resource.schemaVersion !== 1) fail('schemaVersion must be 1');
if (resource.kind !== 'custom') fail(`kind must be "custom", got "${resource.kind}"`);
if (!resource.name) fail('Missing name');
if (!resource.title) fail('Missing title');
if (!resource.columns || typeof resource.columns !== 'object') fail('Missing columns');

const repoPath = resolve(cwd, 'src/resources/app-settings/repository.ts');
if (!existsSync(repoPath)) fail(`repository.ts not found at ${repoPath}`);

try {
  execSync('pnpm crouton validate', { cwd, stdio: 'pipe' });
} catch (e) {
  fail(`crouton validate failed:\n${e.stderr?.toString() ?? e.message}`);
}

console.log('OK: config-only app-settings resource is valid');
