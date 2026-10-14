import type { Command } from 'commander';

import { findConfigPath, loadConfig, resolveFromRoot } from '@ghentcdh/crouton-codegen';
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
        if (result.applied.length === 0) continue;

        needsMigration++;
        const out = JSON.stringify(result.raw, null, 2) + '\n';

        if (opts.check) {
          console.error(`${file}: needs migration (${result.applied.join(', ')})`);
        } else if (opts.dryRun) {
          console.warn(`--- ${file} (would migrate: ${result.applied.join(', ')})`);
          console.warn(out);
        } else {
          await writeFile(file, out, 'utf-8');
          console.warn(`Migrated ${file} (${result.applied.join(', ')})`);
        }
      }

      if (needsMigration > 0 && opts.check) process.exitCode = 1;
    });
};
