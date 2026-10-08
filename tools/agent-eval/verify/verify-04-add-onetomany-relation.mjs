#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const args = process.argv.slice(2);
const cwdIdx = args.indexOf('--cwd');
const cwd = cwdIdx !== -1 ? resolve(args[cwdIdx + 1]) : process.cwd();

const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

const resourcePath = resolve(cwd, 'src/resources/author/resource.json');
if (!existsSync(resourcePath)) fail(`author resource.json not found at ${resourcePath}`);

let resource;
try {
  resource = JSON.parse(readFileSync(resourcePath, 'utf-8'));
} catch (e) {
  fail(`resource.json is not valid JSON: ${e.message}`);
}

const cols = resource.columns ?? {};
const booksCol = cols.books;
if (!booksCol) fail('Missing columns.books on author resource');

const fi = booksCol.fieldInput;
if (!fi) fail('columns.books missing fieldInput');
if (fi.format !== 'relation') fail(`columns.books fieldInput.format must be "relation", got "${fi.format}"`);
if (fi.relationType !== 'oneToMany') fail(`columns.books fieldInput.relationType must be "oneToMany", got "${fi.relationType}"`);
if (!fi.resource) fail('columns.books fieldInput.resource is missing');

const include = resource.include ?? [];
if (!include.includes('books')) fail('"books" must be in the include array');

try {
  execSync('pnpm crouton validate', { cwd, stdio: 'pipe' });
} catch (e) {
  fail(`crouton validate failed:\n${e.stderr?.toString() ?? e.message}`);
}

console.log('OK: oneToMany relation on Author for books is correct');
