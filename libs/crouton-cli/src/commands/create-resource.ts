import type { Command } from 'commander';

import { runCreateResource } from '../create-resource/runner';

export const registerCreateResourceCommand = (program: Command) => {
  program
    .command('create-resource')
    .description(
      'Scaffold a config-only resource (resource.json + repository.ts) whose data access you implement',
    )
    .argument('[name]', 'resource name (directory + id)')
    .option('-k, --kind <kind>', 'resource kind (only "custom" is supported)', 'custom')
    .option('-r, --route <route>', 'URL segment (defaults to the name)')
    .option('-t, --tag <tag>', 'OpenAPI tag (defaults to a label from the name)')
    .option('--title <title>', 'UI title (defaults to a label from the name)')
    .option('-d, --database <name>', 'datasource exposed to the repository as ctx.prisma')
    .option('--id-type <type>', 'primary key type: string | number')
    .option('--cwd <dir>', 'project directory (defaults to the current directory)')
    .option('--dry-run', 'show the planned files without writing')
    .option('-y, --yes', 'accept all defaults (non-interactive)')
    .action(async (name: string | undefined, opts) => {
      try {
        await runCreateResource({
          name: name ?? opts.name,
          kind: opts.kind,
          route: opts.route,
          tag: opts.tag,
          title: opts.title,
          database: opts.database,
          idType: opts.idType,
          cwd: opts.cwd,
          dryRun: opts.dryRun,
          yes: opts.yes,
        });
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
};
