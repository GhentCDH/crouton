#!/usr/bin/env node
// Report exported names defined in more than one package.
// --fail  exit 1 when duplicates exist outside the BRIDGES+DEFERRED allowlists (CI enforcement).
//         COPIES are always reported as violations — they must reach zero.
// --all   also print allowlisted duplicates (default: hide them).

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const rootDir = new URL('..', import.meta.url).pathname;
const packagesDir = join(rootDir, 'packages');
const FAIL_MODE = process.argv.includes('--fail');
const SHOW_ALL = process.argv.includes('--all');

// §2.3 Re-export bridges: api file that re-exports from core with no logic.
// Remove entries here as bridges are deleted in phase 7.
const BRIDGES = new Set([
  'buildDefinitionPayload|crouton-api,crouton-core',
  'buildLayouts|crouton-api,crouton-core',
  'buildResourceJsonPayload|crouton-api,crouton-core',
  'buildResourceOperations|crouton-api,crouton-core',
  'buildSubResourceViewsPayload|crouton-api,crouton-core',
  'buildViewsPayload|crouton-api,crouton-core',
  'EnumEntrySchema|crouton-api,crouton-core',
  'EnumRegistrySchema|crouton-api,crouton-core',
  'externalRouteFor|crouton-api,crouton-core',
  'findConfigPath|crouton-api,crouton-codegen',
  'injectEnumValues|crouton-api,crouton-core',
  'isOperationEnabled|crouton-api,crouton-core',
  'isOperationExternal|crouton-api,crouton-core',
  'ValueLabelColumnSchema|crouton-api,crouton-core',
  'pickByColumns|crouton-api,crouton-core',
  'resolveActions|crouton-api,crouton-core',
  'resolveDefinition|crouton-api,crouton-core',
  'resolveTableActions|crouton-api,crouton-core',
  'schemaFor|crouton-api,crouton-core',
  'SchemaInputSchema|crouton-api,crouton-core',
]);

// §2.1 Real copies: same logic written twice. Goal = zero. Removed phase by phase.
// Phase 2 removes D entries. Phase 6 removes C entries. Phase 1 removes K.
const COPIES = new Set([
  // D — action contracts (phase 2)
  'isRowProcedureAction|crouton-api,crouton-core',
  'isTableProcedureAction|crouton-api,crouton-core',
  'ResourceLinkAction|crouton-api,crouton-core',
  'ResourceRowAction|crouton-api,crouton-core',
  'ResourceRowActionSchema|crouton-api,crouton-core',
  'ResourceRowProcedureAction|crouton-api,crouton-core',
  'ResourceTableAction|crouton-api,crouton-core',
  'ResourceTableActionSchema|crouton-api,crouton-core',
  'ResourceTableProcedureAction|crouton-api,crouton-core',
  // C — parseSchema + types (phase 6)
  'ParseAppConfig|crouton-api,crouton-core',
  'parseSchema|crouton-api,crouton-core,crouton-vue',
  'ParseSchemaInput|crouton-api,crouton-core',
  'ParseSchemaView|crouton-api,crouton-core',
  // K — RawResourceJson (phase 1)
  'RawResourceJson|crouton-api,crouton-core',
  // SidebarGroupSchema name clash (phase 1)
  'SidebarGroupSchema|crouton-api,crouton-core',
]);

// Codegen bridges (out of scope for this plan)
const CODEGEN_BRIDGES = new Set([
  'labelFromId|crouton-codegen,crouton-core,crouton-forms-vue',
  'loadConfig|crouton-api,crouton-codegen',
  'LoadedConfig|crouton-api,crouton-codegen',
  'RESOURCE_SCHEMA_URL|crouton-codegen,crouton-core',
  'serializeResourceJson|crouton-codegen,crouton-core',
  'withResourceHeader|crouton-codegen,crouton-core',
]);

// Everything else — out of scope for this plan (frontend dedup, api↔vue types, etc.)
const DEFERRED = new Set([
  // frontend re-export bridges (frontend dedup deferred to separate plan)
  'BooleanCellBuilder|crouton-core,crouton-forms-vue',
  'BooleanOperationSchema|crouton-core,crouton-forms-vue',
  'buildFilter|crouton-core,crouton-forms-vue',
  'buildSort|crouton-core,crouton-forms-vue',
  'buildSortKey|crouton-core,crouton-forms-vue',
  'ControlBuilder|crouton-core,crouton-forms-vue',
  'ControlType|crouton-core,crouton-forms-vue',
  'createSchema|crouton-core,crouton-forms-vue',
  'enforceRequiredStringMinLength|crouton-core,crouton-forms-vue',
  'extractFilters|crouton-core,crouton-forms-vue',
  'filterToString|crouton-core,crouton-forms-vue',
  'findColumnDef|crouton-core,crouton-forms-vue',
  'findProperty|crouton-core,crouton-forms-vue',
  'fromValueLabel|crouton-core,crouton-forms-vue',
  'TextCellBuilder|crouton-core,crouton-forms-vue',
  'toValueLabel|crouton-core,crouton-forms-vue',
  'uiFromJsonSchema|crouton-core,crouton-forms-vue',
  'TableComponentEmits|crouton-forms-vue,crouton-ui-vue',
  'TableComponentProperties|crouton-forms-vue,crouton-ui-vue',
  'TableComponent|crouton-forms-vue,crouton-vue',
  'UI_TRANSLATOR_KEY|crouton-forms-vue,crouton-ui-vue',
  'useUiTranslator|crouton-forms-vue,crouton-ui-vue',
  'useControlBinding|crouton-forms-vue,crouton-vue',
  'useFormLogic|crouton-forms-vue,crouton-vue',
  'Data|crouton-forms-vue,crouton-vue',
  'DatePicker|crouton-forms-vue,crouton-vue',
  'FormComponent|crouton-forms-vue,crouton-vue',
  // editor-vue re-exports / shares with crouton-vue (deferred)
  'COLSPAN_OPTIONS|crouton-editor-vue,crouton-vue',
  'colspanLabel|crouton-editor-vue,crouton-vue',
  'EditableColumn|crouton-api,crouton-editor-vue',
  'EditableFieldVariant|crouton-api,crouton-editor-vue',
  'FieldVariant|crouton-core,crouton-editor-vue',
  'FieldVariantPatch|crouton-api,crouton-editor-vue',
  'FIRST_CLASS_OPTION_KEYS|crouton-editor-vue,crouton-vue',
  'HIDDEN_FLAG|crouton-editor-vue,crouton-vue',
  'isRelationColumn|crouton-core,crouton-editor-vue',
  'TABS|crouton-editor-vue,crouton-vue',
  'toDraft|crouton-editor-vue,crouton-vue',
  'visibleTabs|crouton-editor-vue,crouton-vue',
  // shared status types (api ↔ vue, deferred)
  'CroutonStatus|crouton-api,crouton-vue',
  'DatabaseStatus|crouton-api,crouton-vue',
  'EnumGroup|crouton-api,crouton-vue',
  'EnumSections|crouton-api,crouton-vue',
  'EnumValue|crouton-api,crouton-vue',
  'I18nLanguageStatus|crouton-api,crouton-vue',
  'I18nStatus|crouton-api,crouton-vue',
  // shared between create-crouton and crouton-cli/codegen (separate tooling, out of scope)
  'CancelledError|create-crouton,crouton-cli',
  'fileExists|create-crouton,crouton-codegen',
  // other
  'ColumnDef|crouton-core,crouton-ui-vue',
  'EnumRegistry|crouton-codegen,crouton-core',
  // api ↔ vue shared types (deferred)
  'Resource|crouton-api,crouton-vue',
  'ResourceStatus|crouton-api,crouton-vue',
  'SidebarGroup|crouton-api,crouton-vue',
  'SidebarLeaf|crouton-api,crouton-vue',
  'SidebarNode|crouton-api,crouton-vue',
  'StatusSummary|crouton-api,crouton-vue',
  'SubResourceStatus|crouton-api,crouton-vue',
  // frontend bridges (deferred to frontend dedup plan)
  'isRelationControl|crouton-forms-vue,crouton-vue',
  'JsonFormComponentEmits|crouton-forms-vue,crouton-vue',
  'JsonFormComponentProp|crouton-forms-vue,crouton-vue',
  'JsonFormComponentProperties|crouton-forms-vue,crouton-vue',
  'LayoutBuilder|crouton-core,crouton-forms-vue',
  'LayoutType|crouton-core,crouton-forms-vue',
  'Method|crouton-core,crouton-forms-vue',
  'MethodSchema|crouton-core,crouton-forms-vue',
  'ModalSize|crouton-core,crouton-forms-vue,crouton-ui-vue',
  'Operation|crouton-core,crouton-forms-vue',
  'OperationSchema|crouton-core,crouton-forms-vue',
  'Operator|crouton-core,crouton-forms-vue',
  'OperatorLabel|crouton-core,crouton-forms-vue',
  'OperatorNoValue|crouton-core,crouton-forms-vue',
  'OperatorOptions|crouton-core,crouton-forms-vue',
  'OperatorsByType|crouton-core,crouton-forms-vue',
  'PositiveRequestNumber|crouton-core,crouton-forms-vue',
  'rankWith|crouton-forms-vue,crouton-vue',
  'Request|crouton-core,crouton-vue',
  'RequestSchema|crouton-core,crouton-forms-vue,crouton-vue',
  'RequestSchemaWithOffset|crouton-core,crouton-forms-vue',
  'ResourceFieldVariantEditorProperties|crouton-editor-vue,crouton-vue',
  'ResourceSchema|crouton-api,crouton-forms-vue',
  'ResponseRequestSchema|crouton-core,crouton-forms-vue',
  'ResponseSchema|crouton-core,crouton-forms-vue',
  'Size|crouton-core,crouton-forms-vue,crouton-ui-vue',
  'SortDir|crouton-core,crouton-vue',
  'SortDirEnum|crouton-core,crouton-forms-vue,crouton-vue',
  'StringOrArray|crouton-core,crouton-forms-vue',
  'stringToFilter|crouton-core,crouton-forms-vue',
  'SubmitFormEvent|crouton-forms-vue,crouton-vue',
  'TableAction|crouton-core,crouton-ui-vue',
  'TableBuilder|crouton-core,crouton-forms-vue',
]);

const key = (name, entries) => `${name}|${entries.map((e) => e.pkg).sort().join(',')}`;
const isCopy = (name, entries) => COPIES.has(key(name, entries));
const isBridge = (name, entries) =>
  BRIDGES.has(key(name, entries)) ||
  CODEGEN_BRIDGES.has(key(name, entries)) ||
  DEFERRED.has(key(name, entries));
// Copies are always violations; bridges and deferred are allowlisted.
const isAllowlisted = (name, entries) => !isCopy(name, entries) && isBridge(name, entries);

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

const copies = duplicates.filter(([name, entries]) => isCopy(name, entries));
const violations = duplicates.filter(([name, entries]) => !isAllowlisted(name, entries) && !isCopy(name, entries));
const allowed = duplicates.filter(([name, entries]) => isAllowlisted(name, entries));

const toShow = SHOW_ALL ? duplicates : [...copies, ...violations];

if (!toShow.length && !violations.length && !copies.length) {
  console.log('No duplicate exports found outside allowlist.');
  process.exit(0);
}

if (copies.length) {
  console.log(`\n§2.1 Copies — must reach zero (${copies.length} remaining):\n`);
  console.log('| Name | Packages |');
  console.log('|------|----------|');
  for (const [name, entries] of copies) {
    const pkgs = entries.map((e) => e.pkg).join(', ');
    console.log(`| ${name} | ${pkgs} |`);
  }
}

if (violations.length) {
  console.log(`\nUntracked violations — add to BRIDGES, COPIES or DEFERRED (${violations.length}):\n`);
  console.log('| Name | Packages |');
  console.log('|------|----------|');
  for (const [name, entries] of violations) {
    const pkgs = entries.map((e) => e.pkg).join(', ');
    console.log(`| ${name} | ${pkgs} |`);
  }
}

if (SHOW_ALL && allowed.length) {
  console.log(`\nAllowlisted (bridges + deferred, ${allowed.length}):\n`);
  console.log('| Name | Packages |');
  console.log('|------|----------|');
  for (const [name, entries] of allowed) {
    const pkgs = entries.map((e) => e.pkg).join(', ');
    console.log(`| ${name} | ${pkgs} |`);
  }
}

console.log(`\nTotal: ${duplicates.length} duplicated names (${copies.length} copies, ${violations.length} untracked violations, ${allowed.length} allowlisted) across ${pkgDirs.length} packages.\n`);

if (FAIL_MODE && (violations.length > 0 || copies.length > 0)) {
  process.exit(1);
}
