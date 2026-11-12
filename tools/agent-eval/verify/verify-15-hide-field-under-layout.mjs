#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

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

const columns = Array.isArray(resource.columns)
  ? Object.fromEntries(resource.columns.map((c) => [c.id, c]))
  : resource.columns ?? {};
const summary = columns.summary;
if (!summary) fail('column "summary" was removed — it must stay (table and view still show it)');
if (summary.hiddenInTable || summary.hiddenInView) fail('"summary" must stay visible in table and view');

const ids = [];
const walk = (node) => {
  for (const item of node?.items ?? []) {
    if (typeof item === 'string') ids.push(item);
    else if (item?.id) ids.push(item.id);
    else if (item && typeof item === 'object' && !item.component) walk(item);
  }
};
const form = resource.layout?.form;
if (!form) fail('layout.form was removed — keep it and edit its items');
walk(form);
if (ids.includes('summary')) fail('"summary" is still listed in layout.form.items (hiddenInForm has no effect under a layout)');
if (!ids.includes('title') || !ids.includes('isbn')) fail('"title" and "isbn" must stay in layout.form.items');

console.log('PASS');
