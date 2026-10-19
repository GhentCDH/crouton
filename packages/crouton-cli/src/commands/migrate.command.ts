import type { Command } from 'commander';

import {
  findConfigPath,
  loadConfig,
  migrateCalculatedColumns,
  migrateDisplayToContainer,
  migrateLayoutPrecedence,
  migrateLookupLabels,
  migrateOpenApiTag,
  migrateRelationKeys,
  migrateRemovedColumnFields,
  migrateRootInclude,
  migrateSearchFields,
  migrateSource,
  resolveFromRoot,
  syncAgentFiles,
} from '@ghentcdh/crouton-codegen';
import { runResourceMigrations } from '@ghentcdh/crouton-core';

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const agentFilesDir = fileURLToPath(new URL('../agent-files', import.meta.url));

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

export const registerMigrateCommand = (program: Command) => {
  program
    .command('migrate')
    .description('Migrate resource.json files and sync agent files to the current version')
    .argument('[paths...]', 'files or directories to migrate (default: discover via crouton.json)')
    .option('--dry-run', 'print what would change without writing')
    .option('--check', 'exit 1 if any file needs migration (CI-friendly)')
    .option('--no-agent-files', 'skip agent file sync; migrate resource.json only')
    .option('--agent-files-only', 'sync agent files only; skip resource.json migration')
    .option('--targets <list>', 'comma-separated agent targets to sync: claude,cursor (default: both)', 'claude,cursor')
    .option('--force', 'overwrite edited agent files without prompting')
    .option('--cwd <dir>', 'project directory', process.cwd())
    .action(async (
      paths: string[],
      opts: {
        dryRun?: boolean;
        check?: boolean;
        agentFiles?: boolean;
        agentFilesOnly?: boolean;
        targets: string;
        force?: boolean;
        cwd: string;
      },
    ) => {
      const cwd = resolve(opts.cwd);
      const skipResources = !!opts.agentFilesOnly;
      const skipAgentFiles = opts.agentFiles === false; // --no-agent-files sets agentFiles to false
      const targets = opts.targets.split(',').map((s) => s.trim()).filter((s): s is 'claude' | 'cursor' =>
        s === 'claude' || s === 'cursor',
      );

      let needsMigration = 0;

      // ── Resource migration ───────────────────────────────────────────
      if (!skipResources) {
        let files: string[];
        if (paths.length > 0) {
          files = paths.map((p) => resolve(p));
        } else {
          files = await discoverResourceFiles(cwd);
          if (files.length === 0 && !skipAgentFiles) {
            // Only error if we also have no agent-files work to do
          } else if (files.length === 0) {
            console.error('No resource.json files found. Pass paths or set up crouton.json.');
            process.exitCode = 1;
            return;
          }
        }

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
          const { resource: relationFixed, report: relationReport } = migrateRelationKeys(colFixed);
          const { resource: displayFixed, report: displayReport } = migrateDisplayToContainer(relationFixed);
          const { changed: lookupChanged, json: lookupFixed } = migrateLookupLabels(displayFixed as any);
          const { changed: includeChanged, json: includeFixed } = migrateRootInclude(lookupFixed as any);
          const { changed: sourceChanged, json: sourceFixed } = migrateSource(includeFixed as any);
          const { changed: calcChanged, json: calcFixed } = migrateCalculatedColumns(sourceFixed as any);
          const { changed: openapiChanged, json: openapiFixed } = migrateOpenApiTag(calcFixed as any);

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
          const hasRelationChanges = relationReport.migratedColumns.length > 0;
          const hasDisplayChanges = displayReport.changed;

          if (!hasVersionMigration && !hasLayoutChanges && !hasSearchChanges && !hasColChanges && !hasRelationChanges && !hasDisplayChanges && !lookupChanged && !includeChanged && !sourceChanged && !calcChanged && !openapiChanged) continue;

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
          if (relationReport.migratedColumns.length)
            labels.push(`lift relation keys to column.relation: ${relationReport.migratedColumns.join(', ')}`);
          if (displayReport.changed)
            labels.push('display/modalSize → layout.form.container / layout.view.container');
          if (lookupChanged)
            labels.push('showInLookup → lookup.labels');
          if (includeChanged)
            labels.push('include → operations.findAll.include / operations.findOne.include');
          if (sourceChanged)
            labels.push('model/table/database/idType → source.*');
          if (calcChanged)
            labels.push('calculatedColumns → columns[id].computed');
          if (openapiChanged)
            labels.push('tag → openapi.tag');

          const out = JSON.stringify(openapiFixed, null, 2) + '\n';

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
      }

      // ── Agent files sync ─────────────────────────────────────────────
      if (!skipAgentFiles) {
        let loaded: Awaited<ReturnType<typeof loadConfig>> | undefined;
        try {
          loaded = await loadConfig(cwd);
        } catch {
          if (!opts.agentFilesOnly) {
            // Silently skip agent-file sync when no crouton.json (resource migration path already handled this)
            return;
          }
          console.error('No crouton.json found — cannot sync agent files.');
          process.exitCode = 1;
          return;
        }

        // Read version from crouton-cli package.json (bundled by tsup via define or import.meta)
        let version = '0.0.1-alpha.82';
        try {
          const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string };
          version = pkg.version;
        } catch { /* use default */ }

        const context = {
          resourcesDir: loaded.config.resourcesDir,
          dataSourcesDir: loaded.config.dataSourcesDir,
          version,
        };

        if (opts.check) {
          const results = await syncAgentFiles({ projectDir: cwd, agentFilesDir, context, targets, dryRun: true });
          const needsUpdate = results.filter((r) => r.action === 'written');
          if (needsUpdate.length > 0) {
            for (const r of needsUpdate) console.error(`agent files: ${r.path} needs update`);
            process.exitCode = 1;
          }
          return;
        }

        const results = await syncAgentFiles({
          projectDir: cwd,
          agentFilesDir,
          context,
          targets,
          force: opts.force,
          dryRun: opts.dryRun,
        });

        for (const r of results) {
          if (r.action === 'written') console.warn(`agent files  ${r.path}  updated`);
          else if (r.action === 'skipped') console.warn(`agent files  ${r.path}  skipped (${r.reason})`);
        }
      }
    });
};
