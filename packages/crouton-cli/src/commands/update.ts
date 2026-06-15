import type { Command } from 'commander';

import { runUpdateResources } from '../update/runner';

export const registerUpdateCommand = (program: Command) => {
  const update = program
    .command('update')
    .description('Update resources in the project');

  update
    .command('resources')
    .description('Introspect the database and create/update resource config files')
    .option('-d, --datasource <name>', 'datasource to use (from crouton.config)')
    .option('-m, --models <list>', 'comma-separated models/resources to limit to')
    .option('--cwd <dir>', 'project directory (defaults to the current directory)')
    .option('--dry-run', 'show the planned changes without writing files')
    .option('-y, --yes', 'accept all recommended defaults (non-interactive)')
    .option('--skip-pull', 'do not run `prisma db pull` (use the current schema)')
    .option('--skip-generate', 'do not run `prisma generate` after pulling')
    .action(async (opts) => {
      try {
        await runUpdateResources({
          datasource: opts.datasource,
          models: opts.models,
          cwd: opts.cwd,
          dryRun: opts.dryRun,
          yes: opts.yes,
          skipPull: opts.skipPull,
          skipGenerate: opts.skipGenerate,
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
};
