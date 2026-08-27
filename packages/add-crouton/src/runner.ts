import * as clack from '@clack/prompts';
import pc from 'picocolors';

import {
  BACKEND_DEPS,
  CancelledError,
  type DiscoveredApp,
  FRONTEND_DEPS,
  type FileEntry,
  type PackageManager,
  assertNotCancel,
  computeMissing,
  detectPackageManager,
  discoverNxApps,
  fileExists,
  installDeps,
  isNxProject,
  writeFiles,
  writeIfAbsent,
} from '@ghentcdh/create-crouton/lib';
import { buildDatasourceFiles } from '@ghentcdh/crouton-codegen';

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface AddOptions {
  cwd?: string;
  backend?: string;
  frontend?: string;
  pm?: string;
  install: boolean;
  docker: boolean;
  postgres: boolean;
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
    let backendApp: DiscoveredApp | undefined;
    let frontendApp: DiscoveredApp | undefined;

    if (nx) {
      const apps = await discoverNxApps(cwd);
      const backends = apps.filter((a) => a.kind === 'backend');
      const frontends = apps.filter((a) => a.kind === 'frontend');

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
        frontendApp = frontends[0];
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

    // 8. Docker setup
    if (opts.docker !== false) {
      await setupDocker(cwd, nx, opts, backendApp, frontendApp);
    }

    // 9. Install deps
    if (opts.install !== false && allMissing.length > 0) {
      const s = clack.spinner();
      s.start(`Installing dependencies with ${pm}`);
      try {
        await installDeps(pm, cwd);
        s.stop('Dependencies installed');
      } catch {
        s.stop('Install failed — run manually');
      }
    }

    // 10. Next steps
    const pmRun = pm === 'npm' ? 'npm run' : pm;
    clack.note(
      [
        opts.docker !== false
          ? 'docker compose up -d          # start services'
          : null,
        `${pmRun} prisma:migrate          # create initial migration`,
        'crouton update resources        # generate resource CRUD',
        `${pmRun} dev                     # start dev server`,
      ]
        .filter(Boolean)
        .join('\n'),
      'Next steps',
    );

    clack.outro(pc.green('Crouton added to project.'));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};

/**
 * Set up Docker files for an existing project.
 * - Compose files at repo root
 * - Dockerfile.dev next to crouton.json
 * - Idempotent: appends to existing compose.yml include list
 */
const setupDocker = async (
  cwd: string,
  nx: boolean,
  opts: AddOptions,
  backendApp?: DiscoveredApp,
  frontendApp?: DiscoveredApp,
): Promise<void> => {
  // Detect project name from package.json or directory
  const projectName = await detectProjectName(cwd);
  const dbName = projectName.replace(/[^a-zA-Z0-9]/g, '_');

  // Determine appName — for add-crouton this is the project name
  // (prefix-based multi-app would require different logic)
  const appName = projectName;

  // Ask about postgres
  const postgres = await resolvePostgres(cwd, opts);

  // Scan used ports and pick free pair
  const usedPorts = await scanUsedPorts(cwd);
  const { frontendPort, backendPort } = findFreePorts(usedPorts);

  const hasFrontend = !!frontendApp;
  const backendAppName = backendApp?.name ?? 'backend';
  const frontendAppName = frontendApp?.name ?? 'frontend';

  // 1. Compose.app.{appName}.yml
  const composeAppPath = resolve(cwd, `compose.app.${appName}.yml`);
  if (await fileExists(composeAppPath)) {
    clack.log.warn(`compose.app.${appName}.yml already exists, skipping.`);
  } else {
    const composeAppContent = generateComposeApp({
      name: projectName,
      appName,
      nx,
      hasFrontend,
      backendAppName,
      frontendAppName,
      dockerfileDev: 'Dockerfile.dev',
      envFile: '.env',
      frontendPort,
      backendPort,
    });
    await writeFileWithDir(composeAppPath, composeAppContent);
    clack.log.success(`Created compose.app.${appName}.yml`);
  }

  // 2. compose.yml — create or append include entry
  const composeYmlPath = resolve(cwd, 'compose.yml');
  await ensureComposeInclude(composeYmlPath, appName, postgres);

  // 3. compose.infra.yml (if postgres and not already present)
  if (postgres) {
    const infraPath = resolve(cwd, 'compose.infra.yml');
    if (!(await fileExists(infraPath))) {
      const infraContent = generateComposeInfra(projectName);
      await writeFileWithDir(infraPath, infraContent);
      clack.log.success('Created compose.infra.yml');
    } else {
      clack.log.info('compose.infra.yml already exists, reusing.');
    }

    // .env.infra
    const envInfraPath = resolve(cwd, '.env.infra');
    if (!(await fileExists(envInfraPath))) {
      const envInfraContent = [
        `POSTGRES_USER=crouton`,
        `POSTGRES_PASSWORD=crouton`,
        `POSTGRES_DB=${dbName}`,
        `POSTGRES_PORT=5432`,
        `POSTGRES_DATA_HOME=./var/pgdata`,
        '',
      ].join('\n');
      await writeFileWithDir(envInfraPath, envInfraContent);
      clack.log.success('Created .env.infra');
    }

    // docker/init-data/.gitkeep
    const gitkeepPath = resolve(cwd, 'docker/init-data/.gitkeep');
    if (!(await fileExists(gitkeepPath))) {
      await writeFileWithDir(gitkeepPath, '');
      clack.log.success('Created docker/init-data/');
    }
  }

  // 4. Dockerfile.dev (at repo root for flat layout)
  const dockerfilePath = resolve(cwd, 'Dockerfile.dev');
  if (!(await fileExists(dockerfilePath))) {
    const dockerfileContent = nx
      ? generateNxDockerfileDev('apps')
      : generateRegularDockerfileDev();
    await writeFileWithDir(dockerfilePath, dockerfileContent);
    clack.log.success('Created Dockerfile.dev');
  } else {
    clack.log.info('Dockerfile.dev already exists, skipping.');
  }

  // 5. Per-app .env with ports
  const envPath = resolve(cwd, '.env');
  if (!(await fileExists(envPath))) {
    const dbUrl = `postgresql://crouton:crouton@localhost:5432/${dbName}?schema=public`;
    const envLines = [
      `DATABASE_URL=${dbUrl}`,
      `FRONTEND_PORT=${frontendPort}`,
      `BACKEND_PORT=${backendPort}`,
      '',
    ].join('\n');
    await writeFileWithDir(envPath, envLines);
    clack.log.success(`Created .env (ports: frontend=${frontendPort}, backend=${backendPort})`);
  } else {
    clack.log.info('.env already exists, skipping.');
  }

  // 6. .dockerignore
  const dockerignorePath = resolve(cwd, '.dockerignore');
  if (!(await fileExists(dockerignorePath))) {
    const dockerignore = [
      'node_modules',
      'dist',
      'generated',
      '.env',
      '.env.*',
      '.env.local',
      '.git',
      '.nx',
      'var/',
      '*.tsbuildinfo',
      '',
    ].join('\n');
    await writeFileWithDir(dockerignorePath, dockerignore);
    clack.log.success('Created .dockerignore');
  }
};

/* ------------------------------------------------------------------ */
/*  Docker file generators                                             */
/* ------------------------------------------------------------------ */

interface ComposeAppOpts {
  name: string;
  appName: string;
  nx: boolean;
  hasFrontend: boolean;
  backendAppName: string;
  frontendAppName: string;
  dockerfileDev: string;
  envFile: string;
  frontendPort: number;
  backendPort: number;
}

const generateComposeApp = (o: ComposeAppOpts): string => {
  const lines: string[] = [
    'networks:',
    `  ${o.name}-net:`,
    `    name: ${o.name}-net`,
    '',
    'services:',
  ];

  if (o.hasFrontend && o.nx) {
    lines.push(
      `  ${o.appName}-frontend:`,
      '    build:',
      '      context: .',
      `      dockerfile: ${o.dockerfileDev}`,
      `    env_file: [${o.envFile}]`,
      '    ports:',
      `      - "${o.frontendPort}:${o.frontendPort}"`,
      '    environment:',
      `      - PORT=${o.frontendPort}`,
      `      - NX_COMMAND=${o.frontendAppName}:dev`,
      '      - WATCHPACK_POLLING=true',
      '      - IS_DOCKER=true',
      '    volumes:',
      '      - .:/app',
      '      - /app/node_modules',
      '      - /app/.nx',
      `    networks: [${o.name}-net]`,
    );
  }

  if (o.nx) {
    lines.push(
      `  ${o.appName}-backend:`,
      '    build:',
      '      context: .',
      `      dockerfile: ${o.dockerfileDev}`,
      `    env_file: [${o.envFile}]`,
      '    ports:',
      `      - "${o.backendPort}:${o.backendPort}"`,
      '    environment:',
      `      - PORT=${o.backendPort}`,
      `      - NX_COMMAND=${o.backendAppName}:serve`,
      '      - WATCHPACK_POLLING=true',
      '      - IS_DOCKER=true',
      '    volumes:',
      '      - .:/app',
      '      - /app/node_modules',
      '      - /app/.nx',
      `    networks: [${o.name}-net]`,
    );
  } else {
    lines.push(
      `  ${o.appName}-backend:`,
      '    build:',
      '      context: .',
      `      dockerfile: ${o.dockerfileDev}`,
      `    env_file: [${o.envFile}]`,
      '    ports:',
      `      - "${o.backendPort}:${o.backendPort}"`,
      '    environment:',
      `      - PORT=${o.backendPort}`,
      '    volumes:',
      '      - .:/app',
      '      - /app/node_modules',
      `    networks: [${o.name}-net]`,
    );
  }

  lines.push('');
  return lines.join('\n');
};

const generateComposeInfra = (name: string): string =>
  [
    'networks:',
    `  ${name}-net:`,
    `    name: ${name}-net`,
    '',
    'services:',
    '  postgres:',
    `    container_name: ${name}.data.app`,
    '    image: postgres:17',
    '    env_file: [.env.infra]',
    '    environment:',
    '      POSTGRES_USER: ${POSTGRES_USER}',
    '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
    '      POSTGRES_DB: ${POSTGRES_DB}',
    '    ports:',
    '      - "${POSTGRES_PORT}:5432"',
    '    volumes:',
    '      - ${POSTGRES_DATA_HOME}:/var/lib/postgresql/data',
    '      - ./docker/init-data:/docker-entrypoint-initdb.d',
    '    healthcheck:',
    '      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]',
    '      interval: 10s',
    '      timeout: 5s',
    '      retries: 5',
    `    networks: [${name}-net]`,
    '',
  ].join('\n');

const generateNxDockerfileDev = (appsRoot: string): string =>
  [
    '# syntax=docker/dockerfile:1.7-labs',
    'FROM node:24-alpine',
    'WORKDIR /app',
    'RUN corepack enable && corepack prepare pnpm@latest --activate',
    'ENV CI=true',
    '',
    'COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./',
    `COPY --parents ${appsRoot}/*/package.json generated/default/*/package.json ./`,
    '',
    'RUN --mount=type=secret,id=npmrc,target=/app/.npmrc pnpm install',
    '',
    'CMD pnpm exec nx run ${NX_COMMAND} --host 0.0.0.0 --port=${PORT}',
    '',
  ].join('\n');

const generateRegularDockerfileDev = (): string =>
  [
    'FROM node:24-alpine',
    'WORKDIR /app',
    'RUN corepack enable && corepack prepare pnpm@latest --activate',
    'ENV CI=true',
    'COPY package.json pnpm-lock.yaml ./',
    'RUN --mount=type=secret,id=npmrc,target=/app/.npmrc pnpm install',
    'CMD ["pnpm","dev"]',
    '',
  ].join('\n');

/* ------------------------------------------------------------------ */
/*  compose.yml include management                                     */
/* ------------------------------------------------------------------ */

/**
 * Ensure compose.yml exists and its include list contains the app entry.
 * Creates the file if missing; appends idempotently if present.
 */
const ensureComposeInclude = async (
  composeYmlPath: string,
  appName: string,
  postgres: boolean,
): Promise<void> => {
  const appEntry = `compose.app.${appName}.yml`;
  const infraEntry = 'compose.infra.yml';

  if (await fileExists(composeYmlPath)) {
    let content = await readFile(composeYmlPath, 'utf-8');
    let changed = false;

    // Ensure include: key exists
    if (!content.includes('include:')) {
      content = `include:\n${content}`;
      changed = true;
    }

    // Append infra entry if postgres and not present
    if (postgres && !content.includes(infraEntry)) {
      content = content.replace(
        'include:\n',
        `include:\n  - path: ${infraEntry}\n    env_file: .env.infra\n`,
      );
      changed = true;
    }

    // Append app entry if not present
    if (!content.includes(appEntry)) {
      content = content.replace(
        'include:\n',
        `include:\n  - ${appEntry}\n`,
      );
      // Move the new entry to the end of the include block
      // by appending after the last include item instead
      // Actually, simpler: just append at the end of the include list.
      // Re-approach: find where include block ends and insert there.
      // For simplicity, append as the last line before any non-include content.
      // The replace above adds at the top which is fine for compose.
      changed = true;
    }

    if (changed) {
      await writeFile(composeYmlPath, content, 'utf-8');
      clack.log.success(`Updated compose.yml (added ${appEntry})`);
    } else {
      clack.log.info('compose.yml already includes this app.');
    }
  } else {
    // Create new compose.yml
    const lines: string[] = ['include:'];
    if (postgres) {
      lines.push(`  - path: ${infraEntry}`);
      lines.push('    env_file: .env.infra');
    }
    lines.push(`  - ${appEntry}`);
    lines.push('');
    await writeFileWithDir(composeYmlPath, lines.join('\n'));
    clack.log.success('Created compose.yml');
  }
};

/* ------------------------------------------------------------------ */
/*  Port scanning                                                      */
/* ------------------------------------------------------------------ */

/**
 * Scan .env files in the repo for FRONTEND_PORT and BACKEND_PORT values.
 */
const scanUsedPorts = async (cwd: string): Promise<Set<number>> => {
  const ports = new Set<number>();
  const envFiles = [resolve(cwd, '.env')];

  // Also scan <dir>/.env for any first-level subdirectories that have crouton.json
  try {
    const { readdir: rd } = await import('node:fs/promises');
    const entries = await rd(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subEnv = resolve(cwd, entry.name, '.env');
        if (await fileExists(subEnv)) {
          envFiles.push(subEnv);
        }
      }
    }
  } catch {
    // ignore
  }

  for (const envPath of envFiles) {
    if (!(await fileExists(envPath))) continue;
    try {
      const content = await readFile(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^(?:FRONTEND_PORT|BACKEND_PORT)=(\d+)/);
        if (match) ports.add(Number(match[1]));
      }
    } catch {
      // ignore unreadable files
    }
  }

  return ports;
};

/**
 * Find a free frontend + backend port pair that doesn't collide with used ports.
 */
const findFreePorts = (usedPorts: Set<number>): { frontendPort: number; backendPort: number } => {
  let fp = 4200;
  while (usedPorts.has(fp)) fp += 10;
  let bp = 3000;
  while (usedPorts.has(bp)) bp += 1;
  return { frontendPort: fp, backendPort: bp };
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const detectProjectName = async (cwd: string): Promise<string> => {
  try {
    const pkgPath = resolve(cwd, 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    // Strip scope prefix if present (@foo/bar → bar)
    const raw: string = pkg.name ?? '';
    const name = raw.startsWith('@') ? raw.split('/')[1] ?? raw : raw;
    if (name) return name;
  } catch {
    // no package.json
  }
  // Fallback to directory name
  const { basename } = await import('node:path');
  return basename(cwd);
};

const writeFileWithDir = async (filePath: string, contents: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf-8');
};

const resolvePostgres = async (cwd: string, opts: AddOptions): Promise<boolean> => {
  // If compose.infra.yml already exists, postgres infra is already set up
  if (await fileExists(resolve(cwd, 'compose.infra.yml'))) {
    clack.log.info('compose.infra.yml found, reusing existing postgres infra.');
    return true;
  }

  if (opts.yes) return opts.postgres;
  if (!opts.postgres) return false;

  return assertNotCancel(
    await clack.confirm({
      message: 'Run PostgreSQL in Docker?',
      initialValue: true,
    }),
  ) as boolean;
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
