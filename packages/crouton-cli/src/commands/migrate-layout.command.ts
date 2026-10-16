import type { Command } from 'commander';

import {
  findConfigPath,
  loadConfig,
  migrateDisplayToContainer,
  migrateLayoutPrecedence,
  migrateLookupLabels,
  migrateRemovedColumnFields,
  migrateRootInclude,
  migrateSearchFields,
  migrateSource,
  resolveFromRoot,
} from '@ghentcdh/crouton-codegen';
import { runResourceMigrations } from '@ghentcdh/crouton-core';

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const discoverResourceFiles = async (cwd: string): Promise<string[]> => {
  const configPath = await findConfigPath(cwd);
  if (!configPath) return [];
  const loaded = await loadConfig(cwd);
  const base = resolveFromRoot(loaded.root, loaded.config.resourcesDir);
  let entries: { isDirectory(): boolean; name: string }[];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => join(base, e.name, 'resource.json'));
};

export const registerMigrateLayoutCommand = (program: Command) => {
  program
    .command('migrate')
    .description('Migrate resource.json files to the current schema version')
    .argument('[paths...]', 'files or directories to migrate (default: discover via crouton.json)')
    .option('--dry-run', 'print what would change without writing')
    .option('--check', 'exit 1 if any file needs migration (CI-friendly)')
    .option('--cwd <dir>', 'project directory', process.cwd())
    .action(async (paths: string[], opts: { dryRun?: boolean; check?: boolean; cwd: string }) => {
      const cwd = resolve(opts.cwd);

      let files: string[];
      if (paths.length > 0) {
        files = paths.map((p) => resolve(p));
      } else {
        files = await discoverResourceFiles(cwd);
        if (files.length === 0) {
          console.error('No resource.json files found. Pass paths or set up crouton.json.');
          process.exitCode = 1;
          return;
        }
      }

      let needsMigration = 0;

      for (const file of files) {
        let raw: string;
        try {
          raw = await readFile(file, 'utf-8');
        } catch {
          console.error(`Cannot read ${file}`);
          process.exitCode = 1;
          continue;
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(raw);
        } catch {
          console.error(`Invalid JSON in ${file}`);
          process.exitCode = 1;
          continue;
        }

        const result = runResourceMigrations(parsed);
        const { resource: layoutFixed, report } = migrateLayoutPrecedence(result.raw);
        const { resource: searchFixed, report: searchReport } = migrateSearchFields(layoutFixed);
        const { resource: colFixed, report: colReport } = migrateRemovedColumnFields(searchFixed);
        const { resource: displayFixed, report: displayReport } = migrateDisplayToContainer(colFixed);
        const { changed: lookupChanged, json: lookupFixed } = migrateLookupLabels(displayFixed as any);
        const { changed: includeChanged, json: includeFixed } = migrateRootInclude(lookupFixed as any);
        const { changed: sourceChanged, json: sourceFixed } = migrateSource(includeFixed as any);

        const hasVersionMigration = result.applied.length > 0;
        const hasLayoutChanges =
          report.appended.form.length > 0 ||
          report.appended.view.length > 0 ||
          report.appended.table.length > 0 ||
          report.removed.form.length > 0 ||
          report.removed.view.length > 0 ||
          report.removed.table.length > 0;
        const hasSearchChanges =
          searchReport.fromLayout.length > 0 || searchReport.fromColumns.length > 0;
        const hasColChanges =
          colReport.columnsWithFieldView.length > 0 ||
          colReport.columnsWithColumnType.length > 0;
        const hasDisplayChanges = displayReport.changed;

        if (!hasVersionMigration && !hasLayoutChanges && !hasSearchChanges && !hasColChanges && !hasDisplayChanges && !lookupChanged && !includeChanged && !sourceChanged) continue;

        needsMigration++;

        const labels: string[] = [...result.applied];
        for (const ctx of ['form', 'view', 'table'] as const) {
          if (report.appended[ctx].length)
            labels.push(`append to layout.${ctx}: ${report.appended[ctx].join(', ')}`);
          if (report.removed[ctx].length)
            labels.push(`remove from layout.${ctx} (hidden by flag): ${report.removed[ctx].join(', ')}`);
        }
        if (searchReport.fromLayout.length)
          labels.push(`searchFields → operations.findAll.search: ${searchReport.fromLayout.join(', ')}`);
        if (searchReport.fromColumns.length)
          labels.push(`col.searchable → operations.findAll.search: ${searchReport.fromColumns.join(', ')}`);
        if (colReport.columnsWithFieldView.length)
          labels.push(`remove fieldView from columns: ${colReport.columnsWithFieldView.join(', ')}`);
        if (colReport.columnsWithColumnType.length)
          labels.push(`remove columnType from columns: ${colReport.columnsWithColumnType.join(', ')}`);
        if (displayReport.changed)
          labels.push('display/modalSize → layout.form.container / layout.view.container');
        if (lookupChanged)
          labels.push('showInLookup → lookup.labels');
        if (includeChanged)
          labels.push('include → operations.findAll.include / operations.findOne.include');
        if (sourceChanged)
          labels.push('model/table/database/idType → source.*');

        const out = JSON.stringify(sourceFixed, null, 2) + '\n';

        if (opts.check) {
          console.error(`${file}: needs migration (${labels.join('; ')})`);
        } else if (opts.dryRun) {
          console.warn(`--- ${file} (would migrate: ${labels.join('; ')})`);
          console.warn(out);
        } else {
          await writeFile(file, out, 'utf-8');
          console.warn(`Migrated ${file} (${labels.join('; ')})`);
        }
      }

      if (needsMigration > 0 && opts.check) process.exitCode = 1;
    });
};
