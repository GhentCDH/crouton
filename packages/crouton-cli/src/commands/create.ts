import * as clack from '@clack/prompts';
import { type Command, Option } from 'commander';

import { runCreateProject } from '@ghentcdh/create-crouton/lib';

import { runCreateDatasource } from '../create-datasource/runner';
import { runCreateResource } from '../create-resource/runner';
import { assertNotCancel } from '../prompts';
import { type CommonOptions, registerCommonOptions, resolveTargetProject, withRun } from './shared';

interface CreateResourceCliOptions extends CommonOptions {
  kind?: string; route?: string; tag?: string; title?: string; datasource?: string; database?: string; idType?: string;
}

interface CreateProjectCliOptions extends Omit<CommonOptions, 'project'> {
  frontend?: boolean; dbUrl?: string; docker?: boolean; backendPort?: string; frontendPort?: string; force?: boolean;
}

interface CreateDatasourceCliOptions extends CommonOptions {
  name?: string; adapter?: 'prisma' | 'custom'; type?: string; urlEnv?: string; generatedImport?: string;
  zodOutput?: string; prismaSchema?: string; prismaConfig?: string; clientOutput?: string;
  default?: boolean;
}

const createResource = async (name: string | undefined, opts: CreateResourceCliOptions) =>
  runCreateResource({
    name,
    kind: opts.kind,
    route: opts.route,
    tag: opts.tag,
    title: opts.title,
    database: opts.datasource ?? opts.database,
    idType: opts.idType,
    cwd: await resolveTargetProject(opts),
    dryRun: opts.dryRun,
    yes: opts.yes,
  });

const createDatasource = async (opts: CreateDatasourceCliOptions) =>
  runCreateDatasource({
    name: opts.name,
    adapter: opts.adapter,
    type: opts.type,
    urlEnv: opts.urlEnv,
    generatedImport: opts.generatedImport,
    zodOutput: opts.zodOutput,
    prismaSchema: opts.prismaSchema,
    prismaConfig: opts.prismaConfig,
    clientOutput: opts.clientOutput,
    default: opts.default,
    cwd: await resolveTargetProject(opts),
    dryRun: opts.dryRun,
    yes: opts.yes,
  });

const port = (v: string | undefined, flag: string): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`${flag} must be a port number, got "${v}".`);
  return n;
};

const createProject = async (name: string | undefined, opts: CreateProjectCliOptions) =>
  runCreateProject(name, {
    cwd: opts.cwd,
    frontend: opts.frontend,
    dbUrl: opts.dbUrl,
    docker: opts.docker,
    backendPort: port(opts.backendPort, '--backend-port'),
    frontendPort: port(opts.frontendPort, '--frontend-port'),
    dryRun: opts.dryRun,
    yes: opts.yes,
    force: opts.force,
  });

export const registerCreateCommand = (program: Command) => {
  const create = registerCommonOptions(
    program
      .command('create')
      .description('Scaffold a resource, datasource or project (asks which when no noun is given)'),
  ).action(
    withRun(async (opts: CommonOptions) => {
      if (opts.yes) throw new Error('Pick what to create: `crouton create resource`, `crouton create datasource` or `crouton create project <name>`.');
      const noun = assertNotCancel(
        await clack.select({
          message: 'What do you want to create?',
          options: [
            { value: 'resource', label: 'resource', hint: 'config-only resource (resource.json + repository.ts)' },
            { value: 'datasource', label: 'datasource', hint: 'data-source.json + Prisma schema/config' },
            { value: 'project', label: 'project', hint: 'add a project (backend + datasource) to this codespace' },
          ],
        }),
      );
      if (noun === 'resource') await createResource(undefined, opts);
      else if (noun === 'datasource') await createDatasource(opts);
      else await createProject(undefined, opts);
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
      .option('-d, --datasource <name>', 'datasource exposed to the repository as ctx.prisma')
      .addOption(new Option('--database <name>', 'deprecated alias for --datasource').hideHelp())
      .option('--id-type <type>', 'primary key type: string | number'),
  ).action(withRun(createResource));

  registerCommonOptions(
    create
      .command('datasource')
      .description('Scaffold a new datasource (data-source.json, index.ts, Prisma schema + config)')
      .option('-n, --name <name>', 'datasource name')
      .option('-a, --adapter <adapter>', 'datasource adapter: prisma | custom')
      .option('-t, --type <type>', 'datasource type (postgres, mysql, sqlite, …)')
      .option('-e, --url-env <env>', 'env var holding the connection URL')
      .option('-i, --generated-import <path>', 'import path for the generated Zod types')
      .option('--zod-output <dir>', 'crouton-prisma zod output dir (default generated/<name>/src)')
      .option('--prisma-schema <path>', 'Prisma schema path (default prisma/<name>/schema.prisma)')
      .option('--prisma-config <path>', 'Prisma config path (default prisma/<name>/prisma.config.ts)')
      .option('--client-output <dir>', 'Prisma client output dir (default generated/<name>/client)')
      .option('--default', 'mark this datasource as the default'),
  ).action(withRun(createDatasource));

  // No -p/--project: the positional name is the new project, not a target to resolve.
  create
    .command('project')
    .description('Add a project (backend app + datasource, optional frontend) to an existing crouton codespace')
    .argument('[name]', 'new project name (folder under the codespace root)')
    .option('--cwd <dir>', 'codespace root (defaults to the current directory)')
    // Both flags so the default stays undefined → asked interactively.
    .option('--frontend', 'include a Vue frontend app (Nx layout only)')
    .option('--no-frontend', 'skip the Vue frontend app')
    .option('--db-url <url>', 'database connection URL for the new project')
    .option('--no-docker', 'skip Docker files')
    .option('--backend-port <n>', 'backend port (default: next free port from 3000)')
    .option('--frontend-port <n>', 'frontend port (default: next free port from 4200)')
    .option('--dry-run', 'list the files that would be written, without writing')
    .option('-y, --yes', 'accept all defaults (non-interactive)')
    .option('--force', 'write into a non-empty project directory')
    .action(withRun(createProject));
};
