import type { Command } from 'commander';

import { registerCommonOptions, withRun } from './shared';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';


const __dirname = dirname(fileURLToPath(import.meta.url));

// ponytail: every migrate noun prints the guide until the codemods land (plan Phase 4).
const printGuide = async (): Promise<void> => {
  // In dev (linked) the file is at repo root, 4 levels up from dist/commands/
  // In published package the file isn't bundled, so we fall back to the GitHub URL.
  const candidates = [
    resolve(__dirname, '..', '..', '..', '..', 'migrate-to-next-alpha.md'),
    resolve(__dirname, '..', '..', '..', 'migrate-to-next-alpha.md'),
    resolve(__dirname, '..', '..', 'migrate-to-next-alpha.md'),
  ];

  for (const guidePath of candidates) {
    try {
      const content = await readFile(guidePath, 'utf-8');
      // eslint-disable-next-line no-console
      console.log('=== Crouton Migration Guide ===\n');
      // eslint-disable-next-line no-console
      console.log(content);
      return;
    } catch {
      /* try next */
    }
  }

  throw new Error(
    'migrate-to-next-alpha.md not found locally.\n' +
      'Download it from:\n' +
      '  https://raw.githubusercontent.com/GhentCDH/crouton/main/migrate-to-next-alpha.md',
  );
};

export const registerMigrateCommand = (program: Command) => {
  const migrate = registerCommonOptions(
    program
      .command('migrate')
      .description('Migrate everything: resources, then layout (or pick a noun below)'),
  ).action(withRun(printGuide));

  registerCommonOptions(
    migrate
      .command('resources')
      .description('Migrate resource.json files to the current schema (prints the migration guide for now)'),
  ).action(withRun(printGuide));

  registerCommonOptions(
    migrate
      .command('layout')
      .description('Migrate resource.json layout nodes to the current schema (prints the migration guide for now)'),
  ).action(withRun(printGuide));
};
