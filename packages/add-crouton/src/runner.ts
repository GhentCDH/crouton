/**
 * Main orchestrator for `add-crouton`.
 * Detects project type → prompts → adds files → optionally installs & configures datasource.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';


import { detectPm, discoverNxApps, isNxWorkspace } from './lib/detect.js';
import { fileExists, readJsonFile, writeAddFiles } from './lib/files.js';
import { buildDockerFiles } from './templates/docker.js';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve as pathResolve } from 'node:path';

export interface AddOptions {
  cwd?: string;
  backend?: string;
  frontend?: string;
  noFrontend?: boolean;
  pm?: string;
  noInstall?: boolean;
  noDocker?: boolean;
  yes?: boolean;
}

const assertNotCancel = <T>(v: T | symbol): T => {
  if (clack.isCancel(v)) throw new Error('__cancelled__');
  return v as T;
};

const tryRun = (cmd: string, cwd: string): void => {
  try {
    execSync(cmd, { cwd, stdio: 'pipe' });
  } catch {
    clack.log.warn(`Command failed: ${cmd} — run it manually.`);
  }
};

// ── Crouton config / enums stubs ──────────────────────────────────────────────
const defaultCroutonJson = (
  resourcesDir: string,
  dataSourcesDir: string,
): string =>
  JSON.stringify(
    {
      resourcesDir,
      dataSourcesDir,
      schemaExportName: '{Model}WithRelationsSchema',
      enumsFile: 'crouton.enums.json',
    },
    null,
    2,
  ) + '\n';

// ── data-source stub ──────────────────────────────────────────────────────────
const dataSourceJsonStub = (urlEnv: string, generatedImport: string): string =>
  JSON.stringify(
    {
      type: 'postgres',
      name: 'default',
      default: true,
      urlEnv,
      generatedTypesImport: generatedImport,
      prismaSchema: 'prisma/schema.prisma',
      prismaConfig: 'prisma.config.ts',
    },
    null,
    2,
  ) + '\n';

const dataSourceIndexStub = (urlEnv: string): string =>
  `import { PrismaClient } from '@prisma/client';\nimport { PrismaPg } from '@prisma/adapter-pg';\nexport const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['${urlEnv}']! }) });\n`;

// ── App module injection note ─────────────────────────────────────────────────
const moduleNote = (resDir: string, dsDir: string): string =>
  `
Add to your app module:

  import { CroutonApiModule } from '@ghentcdh/crouton-api';
  import { join } from 'node:path';

  CroutonApiModule.forResourceDir(
    join(__dirname, '${resDir}'),
    join(__dirname, '${dsDir}'),
    { enumsFile: join(__dirname, 'crouton.enums.json') },
  )
`.trimStart();

export const runAdd = async (opts: AddOptions): Promise<void> => {
  clack.intro(pc.bold(pc.cyan('add-crouton')));

  try {
    const cwd = pathResolve(opts.cwd ?? process.cwd());
    const nx = isNxWorkspace(cwd);

    clack.log.info(
      nx
        ? pc.dim('Nx monorepo detected.')
        : pc.dim('Regular project detected.'),
    );

    // ── Package manager ──────────────────────────────────────────────────────
    const pm: string = opts.pm
      ? opts.pm
      : opts.yes
        ? detectPm(cwd)
        : (assertNotCancel(
            await clack.select({
              message: 'Package manager',
              options: [
                { value: 'pnpm', label: 'pnpm' },
                { value: 'npm', label: 'npm' },
                { value: 'yarn', label: 'yarn' },
                { value: 'bun', label: 'bun' },
              ],
              initialValue: detectPm(cwd),
            }),
          ) as string);

    // ── NX: pick backend & frontend apps ────────────────────────────────────
    let backendDir = cwd; // default: cwd itself (regular)
    let frontendDir: string | null = null;

    if (nx) {
      const apps = await discoverNxApps(cwd);

      // Backend
      const backendChoices: { value: string; label: string; hint?: string }[] =
        [
          ...apps
            .filter((a) => a.kind === 'backend' || a.kind === 'unknown')
            .map((a) => ({ value: a.dir, label: a.name, hint: a.kind })),
          { value: '__new__', label: '+ Create new backend app' },
        ];

      let chosenBackend: string;
      if (opts.backend) {
        chosenBackend = pathResolve(cwd, opts.backend);
      } else if (opts.yes && apps.some((a) => a.kind === 'backend')) {
        chosenBackend = apps.find((a) => a.kind === 'backend')!.dir;
      } else {
        chosenBackend = assertNotCancel(
          await clack.select({
            message: 'Which app is your backend?',
            options: backendChoices,
          }),
        ) as string;
      }

      if (chosenBackend === '__new__') {
        const newName = assertNotCancel(
          await clack.text({
            message: 'New backend app name',
            initialValue: 'backend',
          }),
        ) as string;
        chosenBackend = join(cwd, 'apps', newName);
        await writeAddFiles(chosenBackend, [
          {
            path: 'package.json',
            contents:
              JSON.stringify(
                { name: `@app/${newName}`, version: '0.0.1', type: 'module' },
                null,
                2,
              ) + '\n',
          },
          { path: 'src/main.ts', contents: '// TODO: wire NestJS bootstrap\n' },
        ]);
        clack.log.success(`Created apps/${newName} skeleton.`);
      }
      backendDir = chosenBackend;

      // Frontend
      if (!opts.noFrontend) {
        const frontendApps = apps.filter((a) => a.kind === 'frontend');
        const feChoices: { value: string; label: string; hint?: string }[] = [
          { value: '__none__', label: 'None — skip frontend' },
          ...frontendApps.map((a) => ({
            value: a.dir,
            label: a.name,
            hint: a.kind,
          })),
          { value: '__new__', label: '+ Create new frontend app' },
        ];

        let chosenFrontend: string;
        if (opts.frontend === 'none') {
          chosenFrontend = '__none__';
        } else if (opts.frontend) {
          chosenFrontend = pathResolve(cwd, opts.frontend);
        } else if (opts.yes) {
          chosenFrontend = frontendApps[0]?.dir ?? '__none__';
        } else {
          chosenFrontend = assertNotCancel(
            await clack.select({
              message: 'Which app is your frontend?',
              options: feChoices,
            }),
          ) as string;
        }

        if (chosenFrontend === '__new__') {
          const newFeName = assertNotCancel(
            await clack.text({
              message: 'New frontend app name',
              initialValue: 'frontend',
            }),
          ) as string;
          chosenFrontend = join(cwd, 'apps', newFeName);
          await writeAddFiles(chosenFrontend, [
            {
              path: 'package.json',
              contents:
                JSON.stringify(
                  {
                    name: `@app/${newFeName}`,
                    version: '0.0.1',
                    type: 'module',
                    dependencies: {
                      '@ghentcdh/crouton-vue': '*',
                      vue: '^3.0.0',
                    },
                    devDependencies: {
                      vite: '^6.0.0',
                      '@vitejs/plugin-vue': '^5.0.0',
                    },
                  },
                  null,
                  2,
                ) + '\n',
            },
            {
              path: 'src/main.ts',
              contents:
                "import { createApp } from 'vue';\nimport App from './App.vue';\ncreateApp(App).mount('#app');\n",
            },
          ]);
          clack.log.success(`Created apps/${newFeName} skeleton.`);
        }

        if (chosenFrontend !== '__none__') frontendDir = chosenFrontend;
      }
    } else {
      // Regular: detect scope from existing deps
      const rootPkg =
        (await readJsonFile<Record<string, unknown>>(
          join(cwd, 'package.json'),
        )) ?? {};
      const allDeps = {
        ...((rootPkg['dependencies'] as object) ?? {}),
        ...((rootPkg['devDependencies'] as object) ?? {}),
      };
      const hasFrontend =
        '@ghentcdh/crouton-vue' in allDeps || 'vue' in allDeps;
      if (hasFrontend) frontendDir = cwd;
    }

    // ── Scan missing backend deps ────────────────────────────────────────────
    const bePackageJsonPath = join(backendDir, 'package.json');
    const bePkg =
      (await readJsonFile<Record<string, unknown>>(bePackageJsonPath)) ?? {};
    const beAllDeps = new Set([
      ...Object.keys((bePkg['dependencies'] as object) ?? {}),
      ...Object.keys((bePkg['devDependencies'] as object) ?? {}),
    ]);
    const missingBeDeps = [
      '@ghentcdh/crouton-api',
      '@ghentcdh/crouton-core',
      '@prisma/adapter-pg',
    ].filter((d) => !beAllDeps.has(d));
    const missingBeDevDeps = [
      '@ghentcdh/crouton-cli',
      'prisma',
      'zod-prisma-types',
    ].filter((d) => !beAllDeps.has(d));

    if (missingBeDeps.length || missingBeDevDeps.length) {
      clack.log.warn(
        `Missing backend dependencies:\n${[...missingBeDeps, ...missingBeDevDeps.map((d) => `${d} (dev)`)].map((d) => `  ${d}`).join('\n')}`,
      );
      const addDeps = opts.yes
        ? true
        : (assertNotCancel(
            await clack.confirm({
              message: 'Add them to package.json?',
              initialValue: true,
            }),
          ) as boolean);

      if (addDeps) {
        const updated = { ...bePkg };
        if (missingBeDeps.length) {
          updated['dependencies'] = {
            ...((bePkg['dependencies'] as object) ?? {}),
            ...Object.fromEntries(missingBeDeps.map((d) => [d, '*'])),
          };
        }
        if (missingBeDevDeps.length) {
          updated['devDependencies'] = {
            ...((bePkg['devDependencies'] as object) ?? {}),
            ...Object.fromEntries(missingBeDevDeps.map((d) => [d, '*'])),
          };
        }
        await writeFile(
          bePackageJsonPath,
          JSON.stringify(updated, null, 2) + '\n',
          'utf-8',
        );
        clack.log.success('Updated backend package.json.');
      }
    }

    // ── Write crouton config & stubs ─────────────────────────────────────────
    // Determine paths relative to cwd (root for Nx, backendDir for regular)
    const root = nx ? cwd : backendDir;
    const relResDir = nx
      ? `apps/${backendDir.replace(join(cwd, 'apps') + '/', '')}/src/app/resources`
      : 'resources';
    const relDsDir = 'data-sources';

    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const filesToWrite: import('./lib/files.js').AddFile[] = [];

    if (!(await fileExists(join(root, 'crouton.json')))) {
      filesToWrite.push({
        path: 'crouton.json',
        contents: defaultCroutonJson(relResDir, relDsDir),
      });
    }
    if (!(await fileExists(join(root, 'crouton.enums.json')))) {
      filesToWrite.push({ path: 'crouton.enums.json', contents: '{}\n' });
    }
    if (
      !(await fileExists(join(root, `${relDsDir}/default/data-source.json`)))
    ) {
      filesToWrite.push(
        {
          path: `${relDsDir}/default/data-source.json`,
          contents: dataSourceJsonStub('DATABASE_URL', '@app/generated-types'),
        },
        {
          path: `${relDsDir}/default/index.ts`,
          contents: dataSourceIndexStub('DATABASE_URL'),
        },
      );
    }
    if (!existsSync(join(root, relResDir))) {
      filesToWrite.push({ path: `${relResDir}/.gitkeep`, contents: '' });
    }

    if (filesToWrite.length) {
      const { written, skipped } = await writeAddFiles(root, filesToWrite);
      if (written.length) clack.log.success(`Wrote: ${written.join(', ')}`);
      if (skipped.length)
        clack.log.info(`Already exist (skipped): ${skipped.join(', ')}`);
    }

    // ── Module injection note ─────────────────────────────────────────────────
    clack.log.message(moduleNote(relResDir, relDsDir));

    // ── Install deps ──────────────────────────────────────────────────────────
    const doInstall: boolean = opts.noInstall
      ? false
      : opts.yes
        ? true
        : (assertNotCancel(
            await clack.confirm({
              message: `Run ${pm} install?`,
              initialValue: true,
            }),
          ) as boolean);

    if (doInstall) {
      const s = clack.spinner();
      s.start(`Running ${pm} install…`);
      try {
        execSync(`${pm} install`, { cwd, stdio: 'pipe' });
        s.stop('Dependencies installed.');
      } catch {
        s.stop(pc.yellow('Install failed — run manually.'));
      }
    }

    // ── Configure datasource ──────────────────────────────────────────────────
    const doDatasource: boolean = opts.yes
      ? false
      : (assertNotCancel(
          await clack.confirm({
            message: 'Configure a datasource now?',
            initialValue: false,
          }),
        ) as boolean);

    if (doDatasource) {
      clack.log.step('Running datasource wizard…');
      try {
        execSync(
          `${pm === 'pnpm' ? 'pnpx' : 'npx'} crouton create-datasource`,
          {
            cwd: root,
            stdio: 'inherit',
          },
        );
      } catch {
        clack.log.warn(
          'Could not run crouton create-datasource — run it manually after install.',
        );
      }
    }

    // ── Docker files ──────────────────────────────────────────────────────────
    const doDocker: boolean = opts.noDocker
      ? false
      : opts.yes
        ? true
        : (assertNotCancel(
            await clack.confirm({
              message: 'Generate Docker files?',
              initialValue: true,
            }),
          ) as boolean);

    if (doDocker) {
      const tokens = {
        name: cwd.split('/').pop() ?? 'app',
        Name: 'App',
        pm,
        pmRun: pm === 'npm' ? 'npm run' : pm,
        year: new Date().getFullYear().toString(),
        backendPort: '3000',
        frontendPort: '4200',
        dbName: (cwd.split('/').pop() ?? 'app')
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase(),
        urlEnv: 'DATABASE_URL',
        backendAppName: backendDir.split('/').pop() ?? 'backend',
        frontendAppName: frontendDir?.split('/').pop() ?? 'frontend',
        generatedPackage: '@app/generated-types',
        version: '*',
      };
      const dockerFiles = buildDockerFiles(tokens, {
        isNx: nx,
        includeFrontend: !!frontendDir,
      });
      const { written } = await writeAddFiles(
        root,
        dockerFiles.map((f) => ({ ...f })),
      );
      clack.log.success(`Docker files written: ${written.join(', ')}`);
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    clack.log.message(
      [
        pc.bold('Next steps:'),
        `  ${pc.cyan('docker compose -f docker/compose.yml up -d db')}`,
        `  ${pc.cyan(`${pm} prisma migrate dev --name init`)}`,
        `  ${pc.cyan(`${pm} crouton update resources`)}`,
        `  ${pc.cyan(pm === 'npm' ? 'npm run dev' : `${pm} dev`)}`,
      ].join('\n'),
    );
    clack.outro(pc.green('crouton added successfully!'));
  } catch (err) {
    if (err instanceof Error && err.message === '__cancelled__') {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
