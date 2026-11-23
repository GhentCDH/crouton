import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { buildDatasourceFiles } from '@ghentcdh/crouton-codegen';

import type { PackageManager } from './lib/detect';
import { type FileEntry, loadTemplate, writeFiles } from './lib/files';
import { checkPnpmVersion, installDeps, pmExec } from './lib/pm';
import { CancelledError, assertNotCancel } from './lib/prompts';
import { render } from './lib/render';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

declare const __CROUTON_VERSION__: string;

export interface CreateOptions {
  nx: boolean;
  frontend: boolean;
  sample?: boolean;
  pm?: string;
  install: boolean;
  git: boolean;
  docker: boolean;
  postgres: boolean;
  yes?: boolean;
  force?: boolean;
  dbUrl?: string;
  prefix?: string;
  appsDir?: string;
  backendDir?: string;
  frontendDir?: string;
  generatedDir?: string;
}

/** Folder layout overrides (Nx only). All repo-relative except backend/frontend (under appsDir). */
export interface LayoutOptions {
  prefix?: string;
  appsDir?: string;
  backendDir?: string;
  frontendDir?: string;
  generatedDir?: string;
}

/** Resolved Nx folder layout; every path is repo-relative posix (`.` = repo root). */
export interface LayoutPaths {
  /** Where crouton.json, .env and the Dockerfiles live. */
  configDir: string;
  appsRoot: string;
  backendRoot: string;
  frontendRoot: string;
  generatedRoot: string;
}

const cleanPath = (p: string, flag: string): string => {
  // normalize collapses repeated slashes, so at most one trailing `/` is left.
  const norm = posix.normalize(p.trim().replaceAll('\\', '/'));
  const out = (norm.length > 1 && norm.endsWith('/') ? norm.slice(0, -1) : norm) || '.';
  if (posix.isAbsolute(out) || out === '..' || out.startsWith('../')) {
    throw new Error(`${flag} must be a path inside the workspace, got "${p}".`);
  }
  return out;
};

/**
 * Defaults reproduce the classic layout: `<prefix>/apps/{backend,frontend}` and
 * `<prefix>/generated`. `--apps-dir` without `--prefix` puts crouton.json in the apps dir.
 */
export const resolveLayoutPaths = (o: LayoutOptions): LayoutPaths => {
  const configDir = cleanPath(o.prefix || o.appsDir || '.', '--prefix');
  const appsRoot = o.appsDir ? cleanPath(o.appsDir, '--apps-dir') : posix.join(configDir, 'apps');
  return {
    configDir,
    appsRoot,
    backendRoot: posix.join(appsRoot, cleanPath(o.backendDir || 'backend', '--backend-dir')),
    frontendRoot: posix.join(appsRoot, cleanPath(o.frontendDir || 'frontend', '--frontend-dir')),
    generatedRoot: o.generatedDir ? cleanPath(o.generatedDir, '--generated-dir') : posix.join(configDir, 'generated'),
  };
};

/** `a/b/c` → `../../../`; `.` → `` */
const upTo = (dir: string): string => (dir === '.' ? '' : '../'.repeat(dir.split('/').length));
const relFrom = (from: string, to: string): string => posix.relative(from, to) || '.';

/** Rewrites workspace template paths (`apps/backend/…`, `apps/frontend/…`, `generated/…`) to the resolved layout, relative to configDir. */
export const workspacePathMapper = (p: LayoutPaths) => {
  const map: [string, string][] = [
    ['apps/backend', relFrom(p.configDir, p.backendRoot)],
    ['apps/frontend', relFrom(p.configDir, p.frontendRoot)],
    ['generated', relFrom(p.configDir, p.generatedRoot)],
  ];
  return (path: string): string => {
    for (const [from, to] of map) {
      if (path === from || path.startsWith(`${from}/`)) return posix.join(to, path.slice(from.length));
    }
    return path;
  };
};

/** `.gitignore` prefix for generated dirs: the classic any-depth `generated` glob when it matches, else the exact root. */
export const generatedIgnoreRoot = (generatedRoot: string): string =>
  posix.basename(generatedRoot) === 'generated' ? '**/generated' : generatedRoot;

/**
 * Resolve the templates directory. At runtime after tsup bundling, templates
 * live next to the compiled index.js in dist/templates/. During development
 * via ts-node or similar, they are at ../templates/ relative to src/.
 */
export const resolveTemplateDir = (): string => {
  const thisDir =
    typeof __dirname !== 'undefined'
      ? __dirname
      : fileURLToPath(new URL('.', import.meta.url));
  // In dist: dist/templates/  In dev: ../templates/
  const distPath = resolve(thisDir, 'templates');
  if (existsSync(distPath)) return distPath;
  return resolve(thisDir, '..', 'templates');
};

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

export const toTitle = (name: string): string =>
  name.replace(/[-_]+/g, ' ').split(' ').map(capitalize).join(' ');

export interface TokenInput extends LayoutOptions {
  name: string;
  layout: 'nx' | 'regular';
  frontend: boolean;
  postgres: boolean;
  dbUrl: string;
  pm: PackageManager;
  /** Docker network prefix; defaults to `name` (an added project joins the codespace's network). */
  network?: string;
  backendPort?: number;
  frontendPort?: number;
}

/** Template tokens shared by `create-crouton` and `crouton create project`. */
export const buildTokens = (t: TokenInput): Record<string, string> => {
  const { name, layout, frontend, postgres, pm } = t;
  const paths = layout === 'nx' ? resolveLayoutPaths(t) : undefined;
  const configDir = paths?.configDir ?? '.';
  const dbName = name.replace(/[^a-zA-Z0-9]/g, '_');
  // Last segment, so a nested config dir (`apps/ms-service`) still gives a valid Nx/compose name.
  const appName = configDir === '.' ? name : posix.basename(configDir);
  const tokens: Record<string, string> = {
    name,
    Name: toTitle(name),
    version:
      typeof __CROUTON_VERSION__ !== 'undefined'
        ? __CROUTON_VERSION__
        : 'latest',
    year: String(new Date().getFullYear()),
    pmRun: pm === 'npm' ? 'npm run' : pm,
    urlEnv: 'DATABASE_URL',
    dbUrl:
      t.dbUrl ||
      `postgresql://crouton:crouton@localhost:5432/${dbName}?schema=public`,
    dbName,
    appName,
    network: t.network ?? name,
    frontendPort: String(t.frontendPort ?? 4200),
    backendPort: String(t.backendPort ?? 3000),
  };
  if (paths) {
    const inConfig = (f: string) => posix.join(configDir, f);
    Object.assign(tokens, {
      nx: 'true',
      backendApp: `${appName}-backend`,
      frontendApp: `${appName}-frontend`,
      workspaceRoot: configDir,
      dockerfileDev: inConfig('Dockerfile.dev'),
      envFile: inConfig('.env'),
      appsRoot: paths.appsRoot,
      backendRoot: paths.backendRoot,
      frontendRoot: paths.frontendRoot,
      backendDist: posix.join('dist', paths.backendRoot),
      backendToRoot: upTo(paths.backendRoot),
      frontendToRoot: upTo(paths.frontendRoot),
      backendFromConfig: relFrom(configDir, paths.backendRoot),
      frontendToConfig: relFrom(paths.frontendRoot, configDir),
      backendToGenerated: relFrom(paths.backendRoot, paths.generatedRoot),
      generatedRoot: paths.generatedRoot,
      generatedIgnore: generatedIgnoreRoot(paths.generatedRoot),
      generatedGlob: posix.join(paths.generatedRoot, 'default'),
      generatedTypesPath: posix.join(paths.generatedRoot, 'default/types/src'),
      generatedClientPath: posix.join(paths.generatedRoot, 'default/client'),
    });
    if (configDir !== '.') tokens['prefix'] = configDir;
  } else {
    tokens['regular'] = 'true';
    tokens['dockerfileDev'] = 'Dockerfile.dev';
    tokens['envFile'] = '.env';
  }
  if (frontend) tokens['frontend'] = 'true';
  if (layout === 'nx' && frontend) tokens['nxFrontend'] = 'true';
  if (layout === 'nx' && !frontend) tokens['nxBackendOnly'] = 'true';
  if (postgres) tokens['postgres'] = 'true';
  return tokens;
};

/**
 * The default datasource for a project rooted at `baseDir` (`name` = package scope in Nx).
 * Nx: `paths` places data-sources + generated output; paths in data-source.json are relative to configDir.
 */
export const datasourceFiles = (
  layout: 'nx' | 'regular',
  name: string,
  baseDir: string,
  paths: LayoutPaths = resolveLayoutPaths({}),
): FileEntry[] => {
  const nx = layout === 'nx';
  const generated = nx ? relFrom(paths.configDir, paths.generatedRoot) : 'generated';
  const { files } = buildDatasourceFiles({
    name: 'default',
    dataSourcesDir: nx
      ? posix.join(relFrom(paths.configDir, paths.backendRoot), 'src/app/data-sources')
      : 'src/data-sources',
    urlEnv: 'DATABASE_URL',
    generatedTypesImport: nx ? `@${name}/generated-default-types` : '@app/generated/default/types',
    generatedClientImport: nx ? `@${name}/generated-default-client` : '@app/generated/default/client',
    type: 'postgres',
    default: true,
    zodOutput: posix.join(generated, 'default/types/src'),
    clientOutput: posix.join(generated, 'default/client'),
  });
  return files.map((f) => ({ path: resolve(baseDir, f.path), contents: f.contents }));
};

export const runCreate = async (
  name: string,
  opts: CreateOptions,
): Promise<void> => {
  clack.intro(pc.bold(`create-crouton ${pc.cyan(name)}`));

  try {
    // 1. Validate name + target dir
    const targetDir = resolve(process.cwd(), name);
    if (existsSync(targetDir) && !opts.force) {
      const entries = await readdir(targetDir);
      if (entries.length > 0) {
        clack.log.error(
          `Directory "${name}" already exists and is not empty. Use --force to overwrite.`,
        );
        throw new CancelledError();
      }
    }

    // 2. Prompts
    const layout = await resolveLayout(opts);
    const frontend = await resolveFrontend(opts, layout);
    const layoutOpts = layout === 'nx' ? await resolveLayoutOptions(opts) : {};
    const paths = resolveLayoutPaths(layoutOpts);
    const prefix = paths.configDir === '.' ? undefined : paths.configDir;
    const pm = await resolvePm(opts);

    // Verify pnpm version early — before writing any files
    if (pm === 'pnpm') {
      const pnpmVersion = checkPnpmVersion();
      clack.log.info(`Using pnpm ${pnpmVersion}`);
    }

    const dbUrl = await resolveDbUrl(opts);
    const postgres =
      opts.docker !== false && !dbUrl ? await resolvePostgres(opts) : false;

    // 3. Resolve tokens
    const tokens = buildTokens({ name, layout, ...layoutOpts, frontend, postgres, dbUrl, pm });

    // 4. Read + render templates
    const templateRoot = resolveTemplateDir();
    const skipPaths = !frontend ? ['apps/frontend'] : [];

    let resourcesUpdated = false;

    if (layout === 'nx') {
      // Root templates → targetDir
      const rootTemplateDir = resolve(templateRoot, 'nx', 'root');
      const rootFiles = await loadAndRenderTemplates(
        rootTemplateDir,
        '',
        tokens,
        targetDir,
        // The CI workflow calls crouton's shared workflow, which is pnpm-only.
        pm === 'pnpm' ? [] : ['.github'],
      );
      const files: FileEntry[] = [...rootFiles];

      // Workspace templates → targetDir/<prefix>/ or targetDir/
      const workspaceTemplateDir = resolve(templateRoot, 'nx', 'workspace');
      const workspaceTarget = prefix ? resolve(targetDir, prefix) : targetDir;
      const workspaceFiles = await loadAndRenderTemplates(
        workspaceTemplateDir,
        '',
        tokens,
        workspaceTarget,
        skipPaths,
        workspacePathMapper(paths),
      );
      files.push(...workspaceFiles);

      // 4b. Docker templates — per-file routing
      if (opts.docker !== false) {
        const dockerFiles = await renderDockerTemplates(
          templateRoot,
          tokens,
          targetDir,
          workspaceTarget,
          { postgres },
        );
        files.push(...dockerFiles);
      }

      // 5. Generate datasource files
      files.push(...datasourceFiles('nx', name, workspaceTarget, paths));

      // 6. Write all files
      const written = await writeFiles(files, { force: opts.force });
      clack.log.success(`Wrote ${written} file(s) to ${pc.cyan(name)}/`);

      // 7. Post-scaffold steps
      ({ resourcesUpdated } = await postScaffold(opts, targetDir, pm, dbUrl, prefix));
    } else {
      // Regular layout — no prefix support
      const templateDir = resolve(templateRoot, 'regular');
      const files: FileEntry[] = await loadAndRenderTemplates(
        templateDir,
        '',
        tokens,
        targetDir,
        skipPaths,
      );

      // Docker templates — per-file routing
      if (opts.docker !== false) {
        const dockerFiles = await renderDockerTemplates(
          templateRoot,
          tokens,
          targetDir,
          targetDir,
          { postgres },
        );
        files.push(...dockerFiles);
      }

      // Generate datasource files
      files.push(...datasourceFiles('regular', name, targetDir));

      // Write all files
      const written = await writeFiles(files, { force: opts.force });
      clack.log.success(`Wrote ${written} file(s) to ${pc.cyan(name)}/`);

      // Post-scaffold steps
      ({ resourcesUpdated } = await postScaffold(opts, targetDir, pm, dbUrl));
    }

    // 8. Next steps
    const pmRun = pm === 'npm' ? 'npm run' : pm;
    const prefixFlag = prefix ? ` --project ${prefix}` : '';
    clack.note(
      [
        postgres ? 'docker compose up -d                 # start postgres' : null,
        !resourcesUpdated ? `${pmExec(pm, 'crouton')} update resources${prefixFlag}  # generate resource CRUD` : null,
        `${pmRun} dev                            # start dev server`,
      ]
        .filter(Boolean)
        .join('\n'),
      'Next steps',
    );

    clack.outro(pc.green('Project scaffolded.'));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};

/**
 * Render Docker templates with per-file routing.
 * compose files → targetDir (repo root)
 * Dockerfiles → workspaceTarget (next to crouton.json)
 */
export const renderDockerTemplates = async (
  templateRoot: string,
  tokens: Record<string, string>,
  targetDir: string,
  workspaceTarget: string,
  opts: { postgres: boolean },
): Promise<FileEntry[]> => {
  const dockerDir = resolve(templateRoot, 'docker');
  const files: FileEntry[] = [];

  // compose.yml → targetDir/compose.yml
  const composeYml = render(
    await loadTemplate(dockerDir, 'compose.yml.tmpl'),
    tokens,
  );
  files.push({ path: resolve(targetDir, 'compose.yml'), contents: composeYml });

  // compose.app.tmpl → targetDir/compose.app.{appName}.yml
  const composeApp = render(
    await loadTemplate(dockerDir, 'compose.app.tmpl'),
    tokens,
  );
  files.push({
    path: resolve(targetDir, `compose.app.${tokens['appName']}.yml`),
    contents: composeApp,
  });

  // compose.infra.yml → targetDir/compose.infra.yml (only if postgres)
  if (opts.postgres) {
    const composeInfra = render(
      await loadTemplate(dockerDir, 'compose.infra.yml.tmpl'),
      tokens,
    );
    files.push({
      path: resolve(targetDir, 'compose.infra.yml'),
      contents: composeInfra,
    });

    // .env.infra → targetDir/.env.infra
    const envInfra = render(
      await loadTemplate(dockerDir, '.env.infra.tmpl'),
      tokens,
    );
    files.push({
      path: resolve(targetDir, '.env.infra'),
      contents: envInfra,
    });

    const envInfraExample = render(
      await loadTemplate(dockerDir, '.env.infra.example.tmpl'),
      tokens,
    );
    files.push({
      path: resolve(targetDir, '.env.infra.example'),
      contents: envInfraExample,
    });

    // docker/init-data/.gitkeep
    files.push({
      path: resolve(targetDir, 'docker/init-data/.gitkeep'),
      contents: '',
    });
  }

  // Dockerfile.dev → workspaceTarget/Dockerfile.dev (next to crouton.json)
  const dockerfileDev = render(
    await loadTemplate(dockerDir, 'Dockerfile.dev.tmpl'),
    tokens,
  );
  files.push({
    path: resolve(workspaceTarget, 'Dockerfile.dev'),
    contents: dockerfileDev,
  });

  // Dockerfile.prod → workspaceTarget/Dockerfile.prod
  const dockerfileProd = render(
    await loadTemplate(dockerDir, 'Dockerfile.prod.tmpl'),
    tokens,
  );
  files.push({
    path: resolve(workspaceTarget, 'Dockerfile.prod'),
    contents: dockerfileProd,
  });

  // .dockerignore → targetDir/.dockerignore
  const dockerignore = render(
    await loadTemplate(dockerDir, '.dockerignore.tmpl'),
    tokens,
  );
  files.push({
    path: resolve(targetDir, '.dockerignore'),
    contents: dockerignore,
  });

  return files;
};

const postScaffold = async (
  opts: CreateOptions,
  targetDir: string,
  pm: PackageManager,
  dbUrl: string,
  prefix?: string,
): Promise<{ resourcesUpdated: boolean }> => {
  // git init
  if (opts.git !== false) {
    const s = clack.spinner();
    s.start('Initializing git repository');
    try {
      execSync('git init && git add -A && git commit -m "Initial commit"', {
        cwd: targetDir,
        stdio: 'pipe',
      });
      s.stop('Git repository initialized');
    } catch {
      s.error('Git init failed (non-fatal)');
    }
  }

  let resourcesUpdated = false;

  // Install deps
  if (opts.install !== false) {
    const s = clack.spinner();
    s.start(`Installing dependencies with ${pm}`);
    try {
      await installDeps(pm, targetDir);
      s.stop('Dependencies installed');
    } catch {
      s.error('Install failed — run manually');
    }

    // Run crouton update resources (best-effort, requires DB to be running)
    if (dbUrl) {
      try {
        const s2 = clack.spinner();
        s2.start('Running crouton update resources');
        // In an Nx monorepo the CLI must run from the workspace root and target
        // the app via --project, so it can resolve nx.json / the pnpm workspace.
        const prefixArg = prefix ? ` --project ${prefix}` : '';
        execSync(`${pmExec(pm, 'crouton')} update resources --yes${prefixArg}`, {
          cwd: targetDir,
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: dbUrl },
        });
        resourcesUpdated = true;
        s2.stop('Resources updated');
      } catch (err) {
        const stderr =
          err instanceof Error && 'stderr' in err
            ? String((err as { stderr: unknown }).stderr).trim()
            : '';
        const firstLine = stderr.split('\n').find((l) => l.trim()) ?? '';
        clack.log.warn(
          'crouton update resources failed — run it manually after setting up your database.',
        );
        if (firstLine) clack.log.error(firstLine);
      }
    }
  }

  return { resourcesUpdated };
};

const resolveLayout = async (
  opts: CreateOptions,
): Promise<'nx' | 'regular'> => {
  if (opts.prefix || hasCustomLayout(opts)) return 'nx'; // layout flags imply Nx
  if (opts.yes) return opts.nx ? 'nx' : 'regular';
  if (opts.nx) return 'nx';

  const layout = assertNotCancel(
    await clack.select({
      message: 'Project layout',
      options: [
        { value: 'regular', label: 'Regular (single NestJS app)' },
        {
          value: 'nx',
          label: 'Nx monorepo (backend + frontend + shared libs)',
        },
      ],
    }),
  ) as string;
  return layout as 'nx' | 'regular';
};

const resolveFrontend = async (
  opts: CreateOptions,
  layout: string,
): Promise<boolean> => {
  if (layout === 'regular') return false; // regular layout = backend only
  if (opts.yes) return opts.frontend;
  if (!opts.frontend) return false;

  return assertNotCancel(
    await clack.confirm({
      message: 'Include a Vue frontend app?',
      initialValue: true,
    }),
  ) as boolean;
};

const resolvePrefix = async (
  opts: { prefix?: string; yes?: boolean },
): Promise<string | undefined> => {
  if (opts.prefix) return opts.prefix;
  if (opts.yes) return undefined;

  const prefix = assertNotCancel(
    await clack.text({
      message: 'Subfolder prefix for apps/config (leave empty for flat layout)',
      placeholder: 'e.g. split',
      defaultValue: '',
    }),
  ) as string;
  return prefix.trim() || undefined;
};

const hasCustomLayout = (o: LayoutOptions): boolean =>
  Boolean(o.appsDir || o.backendDir || o.frontendDir || o.generatedDir);

/** Folder layout: flags win; interactive users may opt into customizing every path. */
export const resolveLayoutOptions = async (opts: LayoutOptions & { yes?: boolean }): Promise<LayoutOptions> => {
  const flags: LayoutOptions = {
    prefix: opts.prefix,
    appsDir: opts.appsDir,
    backendDir: opts.backendDir,
    frontendDir: opts.frontendDir,
    generatedDir: opts.generatedDir,
  };
  if (opts.yes || opts.prefix || hasCustomLayout(flags)) return flags;

  const customize = assertNotCancel(
    await clack.confirm({ message: 'Customize the folder layout?', initialValue: false }),
  ) as boolean;
  if (!customize) return { prefix: await resolvePrefix(opts) };

  const ask = async (message: string, initial: string): Promise<string> =>
    (assertNotCancel(await clack.text({ message, initialValue: initial, defaultValue: initial })) as string).trim() || initial;
  const appsDir = await ask('Apps folder (holds backend + frontend)', 'apps');
  const prefix = await ask('Config folder (crouton.json, .env, Dockerfiles)', appsDir === 'apps' ? '.' : appsDir);
  return {
    prefix,
    appsDir,
    backendDir: await ask('Backend folder name', 'backend'),
    frontendDir: await ask('Frontend folder name', 'frontend'),
    generatedDir: await ask('Generated code folder', prefix === '.' ? 'generated' : `${prefix}/generated`),
  };
};

const resolvePm = async (opts: CreateOptions): Promise<PackageManager> => {
  if (opts.pm) return opts.pm as PackageManager;
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

const resolveDbUrl = async (opts: CreateOptions): Promise<string> => {
  if (opts.dbUrl) return opts.dbUrl;
  if (opts.yes) return '';

  const url = assertNotCancel(
    await clack.text({
      message: 'Database URL (leave empty to skip prisma setup)',
      placeholder: 'postgresql://user:pass@localhost:5432/mydb?schema=public',
      defaultValue: '',
    }),
  ) as string;
  return url.trim();
};

const resolvePostgres = async (opts: CreateOptions): Promise<boolean> => {
  if (opts.yes) return opts.postgres;
  if (!opts.postgres) return false;

  return assertNotCancel(
    await clack.confirm({
      message: 'Run PostgreSQL in Docker?',
      initialValue: true,
    }),
  ) as boolean;
};

/**
 * Recursively load all .tmpl files from a template directory, render them,
 * and return FileEntry[] with absolute paths in the target directory.
 */
export const loadAndRenderTemplates = async (
  templateDir: string,
  subPath: string,
  tokens: Record<string, string>,
  targetDir: string,
  skipPaths: string[] = [],
  /** Rewrites a template-relative output path (e.g. to a custom folder layout). */
  mapPath: (rel: string) => string = (rel) => rel,
): Promise<FileEntry[]> => {
  const files: FileEntry[] = [];
  const dir = subPath ? resolve(templateDir, subPath) : templateDir;

  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = subPath ? `${subPath}/${entry.name}` : entry.name;

    if (skipPaths.some((sp) => relPath.startsWith(sp))) continue;

    if (entry.isDirectory()) {
      const nested = await loadAndRenderTemplates(
        templateDir,
        relPath,
        tokens,
        targetDir,
        skipPaths,
        mapPath,
      );
      files.push(...nested);
    } else if (entry.name.endsWith('.tmpl')) {
      const raw = await loadTemplate(templateDir, relPath);
      const rendered = render(raw, tokens);
      const outName = mapPath(relPath.replace(/\.tmpl$/, ''));
      files.push({ path: resolve(targetDir, outName), contents: rendered });
    }
  }

  return files;
};
