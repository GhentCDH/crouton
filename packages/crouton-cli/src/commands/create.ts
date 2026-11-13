import * as clack from '@clack/prompts';
import type { Command } from 'commander';

import { runCreateDatasource } from '../create-datasource/runner';
import { runCreateResource } from '../create-resource/runner';
import { assertNotCancel } from '../prompts';
import { type CommonOptions, registerCommonOptions, resolveTargetProject, withRun } from './shared';

interface CreateResourceCliOptions extends CommonOptions {
  kind?: string; route?: string; tag?: string; title?: string; database?: string; idType?: string;
}

interface CreateDatasourceCliOptions extends CommonOptions {
  name?: string; type?: string; urlEnv?: string; generatedImport?: string;
  zodOutput?: string; prismaSchema?: string; prismaConfig?: string; clientOutput?: string;
  default?: boolean;
}

const createResource = (name: string | undefined, opts: CreateResourceCliOptions) =>
  runCreateResource({
    name,
    kind: opts.kind,
    route: opts.route,
    tag: opts.tag,
    title: opts.title,
    database: opts.database,
    idType: opts.idType,
    cwd: resolveTargetProject(opts),
    dryRun: opts.dryRun,
    yes: opts.yes,
  });

const createDatasource = (opts: CreateDatasourceCliOptions) =>
  runCreateDatasource({
    name: opts.name,
    type: opts.type,
    urlEnv: opts.urlEnv,
    generatedImport: opts.generatedImport,
    zodOutput: opts.zodOutput,
    prismaSchema: opts.prismaSchema,
    prismaConfig: opts.prismaConfig,
    clientOutput: opts.clientOutput,
    default: opts.default,
    cwd: resolveTargetProject(opts),
    dryRun: opts.dryRun,
    yes: opts.yes,
  });

export const registerCreateCommand = (program: Command) => {
  const create = registerCommonOptions(
    program
      .command('create')
      .description('Scaffold a resource or datasource (asks which when no noun is given)'),
  ).action(
    withRun(async (opts: CommonOptions) => {
      if (opts.yes) throw new Error('Pick what to create: `crouton create resource` or `crouton create datasource`.');
      const noun = assertNotCancel(
        await clack.select({
          message: 'What do you want to create?',
          options: [
            { value: 'resource', label: 'resource', hint: 'config-only resource (resource.json + repository.ts)' },
            { value: 'datasource', label: 'datasource', hint: 'data-source.json + Prisma schema/config' },
          ],
        }),
      );
      await (noun === 'resource' ? createResource(undefined, opts) : createDatasource(opts));
    }),
  );

  registerCommonOptions(
    create
      .command('resource')
      .description('Scaffold a config-only resource (resource.json + repository.ts) whose data access you implement')
      .argument('[name]', 'resource name (directory + id)')
      .option('-k, --kind <kind>', 'resource kind (only "custom" is supported)', 'custom')
      .option('-r, --route <route>', 'URL segment (defaults to the name)')
      .option('-t, --tag <tag>', 'OpenAPI tag (defaults to a label from the name)')
      .option('--title <title>', 'UI title (defaults to a label from the name)')
      .option('-d, --database <name>', 'datasource exposed to the repository as ctx.prisma')
      .option('--id-type <type>', 'primary key type: string | number'),
  ).action(withRun(createResource));

  registerCommonOptions(
    create
      .command('datasource')
      .description('Scaffold a new datasource (data-source.json, index.ts, Prisma schema + config)')
      .option('-n, --name <name>', 'datasource name')
      .option('-t, --type <type>', 'datasource type (postgres, mysql, sqlite, …)')
      .option('-e, --url-env <env>', 'env var holding the connection URL')
      .option('-i, --generated-import <path>', 'import path for the generated Zod types')
      .option('--zod-output <dir>', 'crouton-prisma zod output dir (default generated/<name>/src)')
      .option('--prisma-schema <path>', 'Prisma schema path (default prisma/<name>/schema.prisma)')
      .option('--prisma-config <path>', 'Prisma config path (default prisma/<name>/prisma.config.ts)')
      .option('--client-output <dir>', 'Prisma client output dir (default generated/<name>/client)')
      .option('--default', 'mark this datasource as the default'),
  ).action(withRun(createDatasource));
};
