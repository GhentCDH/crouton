#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
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

// Reject removed keys anywhere in the document
const raw = readFileSync(resourcePath, 'utf-8');
if (/"controls"\s*:/.test(raw)) fail('"controls" found — must use "items" instead');
if (/"actions"\s*:/.test(raw) && !/"rowActions"\s*:|"tableActions"\s*:/.test(raw)) {
  fail('"actions" found without "rowActions"/"tableActions" — rename to "rowActions"');
}
// More precise: bare "actions" key (not rowActions/tableActions)
if (/"(?<!row)(?<!table)actions"\s*:/.test(raw)) fail('"actions" key found — rename to "rowActions"');

const tableLayout = resource.layout?.table;
if (!tableLayout) fail('Missing layout.table');

// Find the table node (depth-first)
const findTableNode = (node) => {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'table' || (!node.type && Array.isArray(node.items))) {
    // It's the table node if it has no wrapper-only type
    const wrapperTypes = ['grid', 'vertical', 'horizontal', 'collapse', 'group'];
    if (!wrapperTypes.includes(node.type)) return node;
  }
  for (const item of node.items ?? []) {
    const found = findTableNode(item);
    if (found) return found;
  }
  return null;
};

// Find component in the wrapper (any depth, but not inside the table node)
const findComponentInWrapper = (node, componentName) => {
  if (!node || typeof node !== 'object') return false;
  for (const item of node.items ?? []) {
    if (item?.component === componentName) return true;
    if (item?.type && item.type !== 'table') {
      if (findComponentInWrapper(item, componentName)) return true;
    }
  }
  return false;
};

// Verify CreateByIsbn component exists above the table node
if (!findComponentInWrapper(tableLayout, 'CreateByIsbn')) {
  fail('"CreateByIsbn" component not found in layout.table wrapper (must be above the table node)');
}

// Verify component comes before the table node in items order
const topItems = tableLayout.items ?? [];
const compIdx = topItems.findIndex(i => i?.component === 'CreateByIsbn');
const tableNodeIdx = topItems.findIndex(i => i?.type === 'table');
if (compIdx === -1) fail('"CreateByIsbn" not in top-level items of layout.table wrapper');
if (tableNodeIdx === -1) fail('No "type: table" node found in layout.table items');
if (compIdx >= tableNodeIdx) fail('"CreateByIsbn" must appear before the table node in items order');

// Find table node and check isbn sortable + title
const tableNode = findTableNode(tableLayout);
if (!tableNode) fail('No table node found in layout.table');

const isbnItem = (tableNode.items ?? []).find(i => {
  if (typeof i === 'string') return i === 'isbn';
  if (typeof i === 'object' && i.id === 'isbn') return true;
  return false;
});
if (!isbnItem) fail('"isbn" not found in table node items');
if (typeof isbnItem === 'string') fail('"isbn" must be an object with sortable: true, not a plain string');
if (!isbnItem.sortable) fail('"isbn" item must have sortable: true');

const heading = tableNode.title ?? tableNode.label;
if (!heading) fail('table node must have a "title" or "label" for the heading');
if (heading !== 'Books') fail(`table heading must be "Books", got "${heading}"`);

console.log('OK: layout.table has CreateByIsbn above table, isbn sortable, heading "Books"');
