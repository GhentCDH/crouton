#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

if (!resource.$schema) fail('Missing $schema');
if (resource.schemaVersion !== 1) fail('schemaVersion must be 1');
if (resource.name !== 'book') fail(`name must be "book", got "${resource.name}"`);
if (resource.model !== 'Book') fail(`model must be "Book", got "${resource.model}"`);
if (!resource.columns || typeof resource.columns !== 'object') fail('Missing columns');

const cols = resource.columns;
if (!cols.id?.idField) fail('columns.id must have idField: true');
if (!cols.id?.hiddenInForm) fail('columns.id must have hiddenInForm: true');
if (!cols.title?.searchable) fail('columns.title must have searchable: true');
if (!cols.title?.filterable) fail('columns.title must have filterable: true');
if (!cols.title?.sortable) fail('columns.title must have sortable: true');
if (!cols.isbn?.sortable) fail('columns.isbn must have sortable: true');
if (!cols.publishedYear?.sortable) fail('columns.publishedYear must have sortable: true');

try {
  execSync('pnpm crouton validate', { cwd, stdio: 'pipe' });
} catch (e) {
  fail(`crouton validate failed:\n${e.stderr?.toString() ?? e.message}`);
}

console.log('OK: book resource.json is valid');
