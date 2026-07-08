import * as clack from '@clack/prompts';
import {
  BACKEND_DEPS,
  CancelledError,
  type DiscoveredApp,
  type FileEntry,
  FRONTEND_DEPS,
  type PackageManager,
  assertNotCancel,
  computeMissing,
  detectPackageManager,
  discoverNxApps,
  fileExists,
  isNxProject,
  writeFiles,
  writeIfAbsent,
} from 'create-crouton/lib';
import pc from 'picocolors';

import { buildDatasourceFiles } from '@ghentcdh/crouton-codegen';

import { resolve } from 'node:path';

export interface AddOptions {
  cwd?: string;
  backend?: string;
  frontend?: string;
  pm?: string;
  install: boolean;
  docker: boolean;
  yes?: boolean;
}

export const runAdd = async (opts: AddOptions): Promise<void> => {
  const cwd = resolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('add-crouton'));

  try {
    // 1. Detect project type
    const nx = await isNxProject(cwd);
    clack.log.info(nx ? 'Detected Nx workspace' : 'Regular project');

    let dataSourcesDir = 'src/data-sources';
    let resourcesDir = 'src/resources';

    // 2. If Nx: discover + select apps
    if (nx) {
      const apps = await discoverNxApps(cwd);
      const backends = apps.filter((a) => a.kind === 'backend');
      const frontends = apps.filter((a) => a.kind === 'frontend');

      let backendApp: DiscoveredApp | undefined;

      if (opts.backend) {
        backendApp = apps.find((a) => a.name === opts.backend);
        if (!backendApp) {
          clack.log.error(`Backend app "${opts.backend}" not found.`);
          throw new CancelledError();
        }
      } else if (backends.length === 1) {
        backendApp = backends[0];
        clack.log.info(`Using backend: ${pc.cyan(backendApp.name)}`);
      } else if (backends.length > 1 && !opts.yes) {
        backendApp = assertNotCancel(
          await clack.select({
            message: 'Which app is the backend?',
            options: backends.map((a) => ({ value: a, label: a.name })),
          }),
        ) as DiscoveredApp;
      } else if (backends.length === 0) {
        clack.log.warn('No backend app detected. Crouton config will be placed at project root.');
      }

      if (backendApp) {
        dataSourcesDir = `apps/${backendApp.name}/src/app/data-sources`;
        resourcesDir = `apps/${backendApp.name}/src/app/resources`;
      }

      if (frontends.length > 0) {
        clack.log.info(`Frontend(s) detected: ${frontends.map((f) => pc.cyan(f.name)).join(', ')}`);
      }
    }

    // 3. Detect package manager
    const pm = await resolvePm(cwd, opts);
    clack.log.info(`Package manager: ${pc.cyan(pm)}`);

    // 3b. Scan missing deps
    const backendPkgPath = nx && dataSourcesDir.startsWith('apps/')
      ? resolve(cwd, 'apps', dataSourcesDir.split('/')[1], 'package.json')
      : resolve(cwd, 'package.json');

    const missingBackend = await computeMissing(backendPkgPath, BACKEND_DEPS);
    const allMissing = [...missingBackend.deps, ...missingBackend.devDeps];

    if (allMissing.length > 0) {
      clack.log.warn(`Missing backend deps: ${allMissing.map((d) => pc.yellow(d)).join(', ')}`);
      clack.log.info('Install them after this script finishes.');
    } else {
      clack.log.success('All backend dependencies present.');
    }

    // 4. Write crouton.json (if absent)
    const croutonJsonPath = resolve(cwd, 'crouton.json');
    const croutonJson = JSON.stringify(
      { title: 'Crouton', resourcesDir, dataSourcesDir },
      null,
      2,
    );
    if (await writeIfAbsent(croutonJsonPath, `${croutonJson}\n`)) {
      clack.log.success('Created crouton.json');
    } else {
      clack.log.info('crouton.json already exists, skipping.');
    }

    // 5. Write crouton.enums.json (if absent)
    const enumsPath = resolve(cwd, 'crouton.enums.json');
    if (await writeIfAbsent(enumsPath, '{}\n')) {
      clack.log.success('Created crouton.enums.json');
    }

    // 6. Write data-sources/default/ (if absent)
    const dsAbsDir = resolve(cwd, dataSourcesDir, 'default');
    if (!(await fileExists(dsAbsDir))) {
      const urlEnv = 'DATABASE_URL';
      const generatedImport = '@app/generated/default';

      const { files: dsFiles } = buildDatasourceFiles({
        name: 'default',
        dataSourcesDir,
        urlEnv,
        generatedTypesImport: generatedImport,
        type: 'postgres',
        default: true,
      });

      const entries: FileEntry[] = dsFiles.map((f) => ({
        path: resolve(cwd, f.path),
        contents: f.contents,
      }));
      await writeFiles(entries);
      clack.log.success('Created default datasource');
    } else {
      clack.log.info('data-sources/default/ already exists, skipping.');
    }

    // 7. Append to .env.example
    const envExamplePath = resolve(cwd, '.env.example');
    const envLine = 'DATABASE_URL=postgresql://crouton:crouton@localhost:5432/myapp?schema=public\n';
    if (!(await fileExists(envExamplePath))) {
      await writeIfAbsent(envExamplePath, envLine);
      clack.log.success('Created .env.example');
    }

    clack.outro(pc.green('Crouton added to project.'));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};

const resolvePm = async (cwd: string, opts: AddOptions): Promise<PackageManager> => {
  if (opts.pm) return opts.pm as PackageManager;
  const detected = await detectPackageManager(cwd);
  if (detected) return detected;
  if (opts.yes) return 'pnpm';

  return assertNotCancel(
    await clack.select({
      message: 'Package manager',
      options: [
        { value: 'pnpm', label: 'pnpm' },
        { value: 'npm', label: 'npm' },
        { value: 'yarn', label: 'yarn' },
        { value: 'bun', label: 'bun' },
      ],
    }),
  ) as PackageManager;
};
