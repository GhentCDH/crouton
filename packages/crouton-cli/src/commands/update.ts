import type { Command } from 'commander';

import { runUpdateResources } from '../update/runner';
import { resolve } from 'node:path';


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
    .option('--prefix <name>', 'subfolder prefix (resolves cwd to <cwd>/<prefix>)')
    .option('--dry-run', 'show the planned changes without writing files')
    .option('-y, --yes', 'accept all recommended defaults (non-interactive)')
    .option('--skip-pull', 'do not run `prisma db pull` (use the current schema)')
    .option('--skip-generate', 'do not run `prisma generate` after pulling')
    .option('--draft', 'write newly-created resources with `draft: true` (hidden until reviewed); asked interactively if omitted')
    .action(async (opts) => {
      try {
        const cwd = opts.prefix
          ? resolve(opts.cwd ?? process.cwd(), opts.prefix)
          : opts.cwd;
        await runUpdateResources({
          datasource: opts.datasource,
          models: opts.models,
          cwd,
          dryRun: opts.dryRun,
          yes: opts.yes,
          skipPull: opts.skipPull,
          skipGenerate: opts.skipGenerate,
          draft: opts.draft, // undefined unless --draft was passed; the runner resolves the effective value
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
};
