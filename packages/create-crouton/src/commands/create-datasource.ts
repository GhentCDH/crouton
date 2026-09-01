import type { Command } from 'commander';

import { runCreateDatasource } from '../create-datasource/runner';

export const registerCreateDatasourceCommand = (program: Command) => {
  program
    .command('create-datasource')
    .description('Scaffold a new datasource (data-source.json, index.ts, Prisma schema + config)')
    .option('-n, --name <name>', 'datasource name')
    .option('-t, --type <type>', 'datasource type (postgres, mysql, sqlite, …)')
    .option('-e, --url-env <env>', 'env var holding the connection URL')
    .option('-i, --generated-import <path>', 'import path for the generated Zod types')
    .option('--zod-output <dir>', 'zod-prisma-types output dir (default generated/<name>/src)')
    .option('--prisma-schema <path>', 'Prisma schema path (default prisma/<name>/schema.prisma)')
    .option('--prisma-config <path>', 'Prisma config path (default prisma/<name>/prisma.config.ts)')
    .option('--client-output <dir>', 'Prisma client output dir (default generated/<name>/client)')
    .option('--default', 'mark this datasource as the default')
    .option('--cwd <dir>', 'project directory (defaults to the current directory)')
    .option('--dry-run', 'show the planned files without writing')
    .option('-y, --yes', 'accept all defaults (non-interactive)')
    .action(async (opts) => {
      try {
        await runCreateDatasource({
          name: opts.name,
          type: opts.type,
          urlEnv: opts.urlEnv,
          generatedImport: opts.generatedImport,
          zodOutput: opts.zodOutput,
          prismaSchema: opts.prismaSchema,
          prismaConfig: opts.prismaConfig,
          clientOutput: opts.clientOutput,
          default: opts.default,
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
