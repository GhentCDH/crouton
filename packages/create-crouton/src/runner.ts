import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { buildDatasourceFiles } from '@ghentcdh/crouton-codegen';

import type { PackageManager } from './lib/detect';
import { type FileEntry, loadTemplate, writeFiles } from './lib/files';
import { checkPnpmVersion, installDeps } from './lib/pm';
import { CancelledError, assertNotCancel } from './lib/prompts';
import { render } from './lib/render';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
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
  yes?: boolean;
  force?: boolean;
  dbUrl?: string;
  prefix?: string;
}

/**
 * Resolve the templates directory. At runtime after tsup bundling, templates
 * live next to the compiled index.js in dist/templates/. During development
 * via ts-node or similar, they are at ../templates/ relative to src/.
 */
const resolveTemplateDir = (): string => {
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

const toTitle = (name: string): string =>
  name.replace(/[-_]+/g, ' ').split(' ').map(capitalize).join(' ');

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
    const prefix = layout === 'nx' ? await resolvePrefix(opts) : undefined;
    const pm = await resolvePm(opts);

    // Verify pnpm version early — before writing any files
    if (pm === 'pnpm') {
      const pnpmVersion = checkPnpmVersion();
      clack.log.info(`Using pnpm ${pnpmVersion}`);
    }

    const dbUrl = await resolveDbUrl(opts);

    // 3. Resolve tokens
    const dbName = name.replace(/[^a-zA-Z0-9]/g, '_');
    const tokens: Record<string, string> = {
      name,
      Name: toTitle(name),
      version: typeof __CROUTON_VERSION__ !== 'undefined' ? __CROUTON_VERSION__ : 'latest',
      year: String(new Date().getFullYear()),
      pmRun: pm === 'npm' ? 'npm run' : pm,
      urlEnv: 'DATABASE_URL',
      dbUrl:
        dbUrl ||
        `postgresql://crouton:crouton@localhost:5432/${dbName}?schema=public`,
      dbName,
    };
    if (layout === 'nx') {
      tokens['nx'] = 'true';
      tokens['backendApp'] = 'backend';
      tokens['frontendApp'] = 'frontend';

      if (prefix) {
        tokens['prefix'] = prefix;
        tokens['appsRoot'] = `${prefix}/apps`;
        tokens['schemaPath'] =
          '../../../node_modules/nx/schemas/project-schema.json';
        tokens['tsconfigBase'] = '../../../tsconfig.base.json';
        tokens['generatedTypesPath'] = `${prefix}/generated/default/types/src`;
        tokens['generatedClientPath'] = `${prefix}/generated/default/client`;
      } else {
        tokens['noPrefix'] = 'true';
        tokens['appsRoot'] = 'apps';
        tokens['schemaPath'] =
          '../../node_modules/nx/schemas/project-schema.json';
        tokens['tsconfigBase'] = '../../tsconfig.base.json';
        tokens['generatedTypesPath'] = 'generated/default/types/src';
        tokens['generatedClientPath'] = 'generated/default/client';
      }
    }
    if (frontend) {
      tokens['frontend'] = 'true';
    }

    // 4. Read + render templates
    const templateRoot = resolveTemplateDir();
    const skipPaths = !frontend ? ['apps/frontend'] : [];

    if (layout === 'nx') {
      // Root templates → targetDir
      const rootTemplateDir = resolve(templateRoot, 'nx', 'root');
      const rootFiles = await loadAndRenderTemplates(
        rootTemplateDir,
        '',
        tokens,
        targetDir,
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
      );
      files.push(...workspaceFiles);

      // 4b. Docker templates
      if (opts.docker !== false) {
        const dockerDir = resolve(templateRoot, 'docker');
        const dockerFiles = await loadAndRenderTemplates(
          dockerDir,
          '',
          tokens,
          targetDir,
        );
        files.push(...dockerFiles);
      }

      // 5. Generate datasource files
      const dataSourcesDir = 'apps/backend/src/app/data-sources';
      const generatedImport = `@${name}/generated-default-types`;
      const generatedClientImport = `@${name}/generated-default-client`;

      const { files: dsFiles } = buildDatasourceFiles({
        name: 'default',
        dataSourcesDir,
        urlEnv: 'DATABASE_URL',
        generatedTypesImport: generatedImport,
        generatedClientImport,
        type: 'postgres',
        default: true,
        zodOutput: 'generated/default/types/src',
        clientOutput: 'generated/default/client',
      });

      for (const f of dsFiles) {
        files.push({
          path: resolve(workspaceTarget, f.path),
          contents: f.contents,
        });
      }

      // 6. Write all files
      const written = await writeFiles(files, { force: opts.force });
      clack.log.success(`Wrote ${written} file(s) to ${pc.cyan(name)}/`);

      // 7. Post-scaffold steps
      await postScaffold(opts, targetDir, pm, dbUrl, prefix);
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

      // Docker templates
      if (opts.docker !== false) {
        const dockerTokens = { ...tokens, regular: 'true' };
        const dockerDir = resolve(templateRoot, 'docker');
        const dockerFiles = await loadAndRenderTemplates(
          dockerDir,
          '',
          dockerTokens,
          targetDir,
        );
        files.push(...dockerFiles);
      }

      // Generate datasource files
      const dataSourcesDir = 'src/data-sources';
      const generatedImport = '@app/generated/default/types';
      const generatedClientImport = '@app/generated/default/client';

      const { files: dsFiles } = buildDatasourceFiles({
        name: 'default',
        dataSourcesDir,
        urlEnv: 'DATABASE_URL',
        generatedTypesImport: generatedImport,
        generatedClientImport,
        type: 'postgres',
        default: true,
        zodOutput: 'generated/default/types/src',
        clientOutput: 'generated/default/client',
      });

      for (const f of dsFiles) {
        files.push({ path: resolve(targetDir, f.path), contents: f.contents });
      }

      // Write all files
      const written = await writeFiles(files, { force: opts.force });
      clack.log.success(`Wrote ${written} file(s) to ${pc.cyan(name)}/`);

      // Post-scaffold steps
      await postScaffold(opts, targetDir, pm, dbUrl);
    }

    // 8. Next steps
    const pmRun = pm === 'npm' ? 'npm run' : pm;
    const prefixFlag = prefix ? ` --prefix ${prefix}` : '';
    clack.note(
      [
        opts.docker !== false
          ? 'docker compose up -d          # start postgres'
          : null,
        `${pmRun} prisma:migrate          # create initial migration`,
        `crouton update resources${prefixFlag}        # generate resource CRUD`,
        `${pmRun} dev                     # start dev server`,
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

const postScaffold = async (
  opts: CreateOptions,
  targetDir: string,
  pm: PackageManager,
  dbUrl: string,
  prefix?: string,
): Promise<void> => {
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
      s.stop('Git init failed (non-fatal)');
    }
  }

  // Install deps
  if (opts.install !== false) {
    const s = clack.spinner();
    s.start(`Installing dependencies with ${pm}`);
    try {
      await installDeps(pm, targetDir);
      s.stop('Dependencies installed');
    } catch {
      s.stop('Install failed — run manually');
    }

    // Run crouton update resources (best-effort, requires DB to be running)
    if (dbUrl) {
      try {
        const s2 = clack.spinner();
        s2.start('Running crouton update resources');
        const croutonCwd = prefix ? resolve(targetDir, prefix) : targetDir;
        execSync('npx crouton update resources --yes', {
          cwd: croutonCwd,
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: dbUrl },
        });
        s2.stop('Resources updated');
      } catch (err) {
        const stderr =
          err instanceof Error && 'stderr' in err
            ? String((err as { stderr: unknown }).stderr).trim()
            : '';
        clack.log.warn(
          'crouton update resources failed — run it manually after setting up your database.' +
            (stderr ? `\n${pc.dim(stderr)}` : ''),
        );
      }
    }
  }
};

const resolveLayout = async (
  opts: CreateOptions,
): Promise<'nx' | 'regular'> => {
  if (opts.prefix) return 'nx'; // --prefix implies Nx layout
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
  opts: CreateOptions,
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

/**
 * Recursively load all .tmpl files from a template directory, render them,
 * and return FileEntry[] with absolute paths in the target directory.
 */
const loadAndRenderTemplates = async (
  templateDir: string,
  subPath: string,
  tokens: Record<string, string>,
  targetDir: string,
  skipPaths: string[] = [],
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
      );
      files.push(...nested);
    } else if (entry.name.endsWith('.tmpl')) {
      const raw = await loadTemplate(templateDir, relPath);
      const rendered = render(raw, tokens);
      const outName = relPath.replace(/\.tmpl$/, '');
      files.push({ path: resolve(targetDir, outName), contents: rendered });
    }
  }

  return files;
};
