import type { Command } from 'commander';

import {
  runTranslationsInit,
  runTranslationsUpdate,
} from '../translations/runner';
import { resolve } from 'node:path';

export const registerTranslationsCommand = (program: Command) => {
  const translations = program
    .command('translations')
    .description('Manage translation bundles');

  translations
    .command('init')
    .description(
      'Create translation files for every configured language',
    )
    .option(
      '--cwd <dir>',
      'project directory (defaults to the current directory)',
    )
    .option('--lang <list>', 'comma-separated languages to limit to')
    .option(
      '--dry-run',
      'show the planned changes without writing files',
    )
    .option(
      '-y, --yes',
      'accept all recommended defaults (non-interactive)',
    )
    .action(async (opts) => {
      try {
        await runTranslationsInit({
          cwd: opts.cwd ? resolve(opts.cwd) : undefined,
          lang: opts.lang,
          dryRun: opts.dryRun,
          yes: opts.yes,
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });

  translations
    .command('update')
    .description('Regenerate and merge translation bundles')
    .option(
      '--cwd <dir>',
      'project directory (defaults to the current directory)',
    )
    .option('--lang <list>', 'comma-separated languages to limit to')
    .option(
      '--prune',
      'remove keys with no backing column/enum (reports first)',
    )
    .option(
      '--dry-run',
      'show the planned changes without writing files',
    )
    .option(
      '-y, --yes',
      'accept all recommended defaults (non-interactive)',
    )
    .action(async (opts) => {
      try {
        await runTranslationsUpdate({
          cwd: opts.cwd ? resolve(opts.cwd) : undefined,
          lang: opts.lang,
          prune: opts.prune,
          dryRun: opts.dryRun,
          yes: opts.yes,
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
};
