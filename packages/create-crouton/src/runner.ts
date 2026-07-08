import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildDatasourceFiles } from '@ghentcdh/crouton-codegen';

import { render } from './lib/render';
import { type FileEntry, loadTemplate, writeFiles } from './lib/files';
import { assertNotCancel, CancelledError } from './lib/prompts';
import type { PackageManager } from './lib/detect';

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
}

/**
 * Resolve the templates directory. At runtime after tsup bundling, templates
 * live next to the compiled index.js in dist/templates/. During development
 * via ts-node or similar, they are at ../templates/ relative to src/.
 */
const resolveTemplateDir = (): string => {
  const thisDir = typeof __dirname !== 'undefined'
    ? __dirname
    : fileURLToPath(new URL('.', import.meta.url));
  // In dist: dist/templates/  In dev: ../templates/
  const distPath = resolve(thisDir, 'templates');
  if (existsSync(distPath)) return distPath;
  return resolve(thisDir, '..', 'templates');
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const toTitle = (name: string): string =>
  name
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map(capitalize)
    .join(' ');

export const runCreate = async (name: string, opts: CreateOptions): Promise<void> => {
  clack.intro(pc.bold(`create-crouton ${pc.cyan(name)}`));

  try {
    // 1. Validate name + target dir
    const targetDir = resolve(process.cwd(), name);
    if (existsSync(targetDir) && !opts.force) {
      const entries = await readdir(targetDir);
      if (entries.length > 0) {
        clack.log.error(`Directory "${name}" already exists and is not empty. Use --force to overwrite.`);
        throw new CancelledError();
      }
    }

    // 2. Prompts
    const layout = await resolveLayout(opts);
    const frontend = await resolveFrontend(opts, layout);
    const pm = await resolvePm(opts);

    // 3. Resolve tokens
    const tokens: Record<string, string> = {
      name,
      Name: toTitle(name),
      year: String(new Date().getFullYear()),
      pmRun: pm === 'npm' ? 'npm run' : pm,
      urlEnv: 'DATABASE_URL',
      dbName: name.replace(/[^a-zA-Z0-9]/g, '_'),
    };
    if (layout === 'nx') {
      tokens['nx'] = 'true';
      tokens['backendApp'] = 'backend';
      tokens['frontendApp'] = 'frontend';
    }
    if (frontend) {
      tokens['frontend'] = 'true';
    }

    // 4. Read + render templates
    const templateRoot = resolveTemplateDir();
    const templateDir = layout === 'nx'
      ? resolve(templateRoot, 'nx')
      : resolve(templateRoot, 'regular');

    const files: FileEntry[] = await loadAndRenderTemplates(templateDir, '', tokens, targetDir);

    // 5. Generate datasource files via buildDatasourceFiles()
    const dataSourcesDir = layout === 'nx' ? 'apps/backend/src/app/data-sources' : 'src/data-sources';
    const generatedImport = layout === 'nx'
      ? `@${name}/generated/default`
      : '@app/generated/default';

    const { files: dsFiles } = buildDatasourceFiles({
      name: 'default',
      dataSourcesDir,
      urlEnv: 'DATABASE_URL',
      generatedTypesImport: generatedImport,
      type: 'postgres',
      default: true,
    });

    for (const f of dsFiles) {
      files.push({ path: resolve(targetDir, f.path), contents: f.contents });
    }

    // 6. Write all files
    const written = await writeFiles(files, { force: opts.force });
    clack.log.success(`Wrote ${written} file(s) to ${pc.cyan(name)}/`);

    clack.outro(pc.green('Project scaffolded.'));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};

const resolveLayout = async (opts: CreateOptions): Promise<'nx' | 'regular'> => {
  if (opts.yes) return opts.nx ? 'nx' : 'regular';
  if (opts.nx) return 'nx';

  const layout = assertNotCancel(
    await clack.select({
      message: 'Project layout',
      options: [
        { value: 'regular', label: 'Regular (single NestJS app)' },
        { value: 'nx', label: 'Nx monorepo (backend + frontend + shared libs)' },
      ],
    }),
  ) as string;
  return layout as 'nx' | 'regular';
};

const resolveFrontend = async (opts: CreateOptions, layout: string): Promise<boolean> => {
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

/**
 * Recursively load all .tmpl files from a template directory, render them,
 * and return FileEntry[] with absolute paths in the target directory.
 */
const loadAndRenderTemplates = async (
  templateDir: string,
  subPath: string,
  tokens: Record<string, string>,
  targetDir: string,
): Promise<FileEntry[]> => {
  const files: FileEntry[] = [];
  const dir = subPath ? resolve(templateDir, subPath) : templateDir;

  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relPath = subPath ? `${subPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const nested = await loadAndRenderTemplates(templateDir, relPath, tokens, targetDir);
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
