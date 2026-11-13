import type { Command } from 'commander';

import { runTranslationsUpdate } from '../translations/runner';
import { runUpdateResources } from '../update/runner';
import { type CommonOptions, registerCommonOptions, resolveTargetProject, runAggregate, withRun } from './shared';

interface UpdateResourcesCliOptions extends CommonOptions {
  datasource?: string;
  models?: string;
  skipPull?: boolean;
  skipGenerate?: boolean;
  draft?: boolean;
}

interface UpdateTranslationsCliOptions extends CommonOptions {
  lang?: string;
  prune?: boolean;
}

const updateResources = async (opts: UpdateResourcesCliOptions) =>
  runUpdateResources({
    datasource: opts.datasource,
    models: opts.models,
    cwd: await resolveTargetProject(opts),
    dryRun: opts.dryRun,
    yes: opts.yes,
    skipPull: opts.skipPull,
    skipGenerate: opts.skipGenerate,
    draft: opts.draft, // undefined unless --draft was passed; the runner resolves the effective value
  });

const updateTranslations = async (opts: UpdateTranslationsCliOptions) =>
  runTranslationsUpdate({
    cwd: await resolveTargetProject(opts),
    lang: opts.lang,
    prune: opts.prune,
    dryRun: opts.dryRun,
    yes: opts.yes,
  });

export const registerUpdateCommand = (program: Command) => {
  const update = registerCommonOptions(
    program
      .command('update')
      .description('Update everything: resources, then translations (or pick a noun below)'),
  ).action(
    withRun((opts: CommonOptions) =>
      runAggregate('crouton update', opts, [
        { name: 'update resources', run: updateResources },
        { name: 'update translations', run: updateTranslations },
      ]),
    ),
  );

  registerCommonOptions(
    update
      .command('resources')
      .description('Introspect the database and create/update resource config files')
      .option('-d, --datasource <name>', 'datasource to use (from crouton.config)')
      .option('-m, --models <list>', 'comma-separated models/resources to limit to'),
  )
    .option('--skip-pull', 'do not run `prisma db pull` (use the current schema)')
    .option('--skip-generate', 'do not run `prisma generate` after pulling')
    .option('--draft', 'write newly-created resources with `draft: true` (hidden until reviewed); asked interactively if omitted')
    .action(withRun(updateResources));

  registerCommonOptions(
    update
      .command('translations')
      .description('Regenerate and merge translation bundles')
      .option('--lang <list>', 'comma-separated languages to limit to')
      .option('--prune', 'remove keys with no backing column/enum (reports first)'),
  ).action(withRun(updateTranslations));
};
