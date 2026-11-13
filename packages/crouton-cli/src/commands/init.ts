import type { Command } from 'commander';

import { runTranslationsInit } from '../translations/runner';
import { type CommonOptions, registerCommonOptions, resolveTargetProject, withRun } from './shared';

export const registerInitCommand = (program: Command) => {
  const init = program.command('init').description('Initialise project files');

  registerCommonOptions(
    init
      .command('translations')
      .description('Create translation files for every configured language')
      .option('--lang <list>', 'comma-separated languages to limit to'),
  ).action(
    withRun(async (opts: CommonOptions & { lang?: string }) =>
      runTranslationsInit({
        cwd: await resolveTargetProject(opts),
        lang: opts.lang,
        dryRun: opts.dryRun,
        yes: opts.yes,
      }),
    ),
  );
};
