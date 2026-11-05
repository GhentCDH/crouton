import type { Command } from 'commander';

import { runTranslationsUpdate } from '../translations/runner';
import { resolve } from 'node:path';

interface TranslationsUpdateOptions {
  cwd?: string;
  lang?: string;
  prune?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

const translationsUpdateAction = async (opts: TranslationsUpdateOptions) => {
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
};

/**
 * Register a translations-update subcommand. Used both as
 * `crouton translations update` and as the `crouton update translations` alias,
 * which previously carried identical option/action blocks.
 */
export const registerTranslationsUpdateSubcommand = (
  parent: Command,
  name: string,
  description: string,
): void => {
  parent
    .command(name)
    .description(description)
    .option('--cwd <dir>', 'project directory (defaults to the current directory)')
    .option('--lang <list>', 'comma-separated languages to limit to')
    .option('--prune', 'remove keys with no backing column/enum (reports first)')
    .option('--dry-run', 'show the planned changes without writing files')
    .option('-y, --yes', 'accept all recommended defaults (non-interactive)')
    .action(translationsUpdateAction);
};
