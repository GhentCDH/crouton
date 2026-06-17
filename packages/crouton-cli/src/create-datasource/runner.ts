/**
 * `crouton create-datasource` — scaffold a new self-describing datasource:
 * `data-sources/<name>/{data-source.json,index.ts}` plus a per-datasource
 * `prisma/<name>/{schema.prisma,prisma.config.ts}`. Interactive by default;
 * fully scriptable via flags. The file set comes from the pure
 * `buildDatasourceFiles` engine helper.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import {
  type LoadedConfig,
  buildDatasourceFiles,
  loadConfig,
  loadDatasources,
  resolveFromRoot,
} from '@ghentcdh/crouton-codegen';

import { CancelledError } from '../update/resolver';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve as pathResolve } from 'node:path';

export interface CreateDatasourceOptions {
  cwd?: string;
  name?: string;
  type?: string;
  urlEnv?: string;
  generatedImport?: string;
  zodOutput?: string;
  prismaSchema?: string;
  prismaConfig?: string;
  clientOutput?: string;
  default?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

const assertNotCancel = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) throw new CancelledError();
  return value as T;
};

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

/** Convert a datasource name to a default env var, e.g. `analyticsdb` → `ANALYTICSDB_DATABASE_URL`. */
const defaultUrlEnv = (name: string): string =>
  `${name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}_DATABASE_URL`;

export const runCreateDatasource = async (opts: CreateDatasourceOptions): Promise<void> => {
  const cwd = pathResolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('crouton create-datasource'));

  try {
    let loaded: LoadedConfig;
    try {
      loaded = await loadConfig(cwd);
    } catch {
      clack.log.error(
        'No crouton.json found. Create one first (e.g. run `crouton update resources`), then add datasources.',
      );
      throw new CancelledError();
    }

    const existing = await loadDatasources(loaded).catch(() => []);
    const existingNames = new Set(existing.map((d) => d.name));
    const hasDefault = existing.some((d) => d.default);

    // ── name ──────────────────────────────────────────────────────────────
    const name =
      opts.name ??
      (opts.yes
        ? undefined
        : (assertNotCancel(
            await clack.text({
              message: 'Datasource name',
              placeholder: 'analyticsdb',
              validate: (v) => {
                if (!v?.trim()) return 'Name is required';
                if (!/^[a-z][a-z0-9_-]*$/i.test(v.trim())) return 'Use letters, digits, - or _';
                if (existingNames.has(v.trim())) return `Datasource "${v.trim()}" already exists`;
                return undefined;
              },
            }),
          ) as string));
    if (!name) {
      clack.log.error('A datasource name is required (pass --name).');
      throw new CancelledError();
    }
    if (existingNames.has(name)) {
      clack.log.error(`Datasource "${name}" already exists.`);
      throw new CancelledError();
    }

    // ── url env ─────────────────────────────────────────────────────────────
    const urlEnv =
      opts.urlEnv ??
      (opts.yes
        ? defaultUrlEnv(name)
        : (assertNotCancel(
            await clack.text({
              message: 'Env var for the connection URL',
              initialValue: defaultUrlEnv(name),
              validate: (v) => (v?.trim() ? undefined : 'Required'),
            }),
          ) as string));

    // ── generated types import ──────────────────────────────────────────────
    const generatedImport =
      opts.generatedImport ??
      (opts.yes
        ? `@app/generated/${name}`
        : (assertNotCancel(
            await clack.text({
              message: 'Import path for this datasource’s generated Zod types',
              initialValue: `@app/generated/${name}`,
              validate: (v) => (v?.trim() ? undefined : 'Required'),
            }),
          ) as string));

    // ── default? ──────────────────────────────────────────────────────────
    let makeDefault = opts.default ?? false;
    if (opts.default === undefined && !opts.yes) {
      if (existing.length === 0) {
        makeDefault = true; // first datasource is the default
      } else if (!hasDefault) {
        makeDefault = assertNotCancel(
          await clack.confirm({ message: 'Mark this datasource as the default?', initialValue: false }),
        ) as boolean;
      }
    }
    if (makeDefault && hasDefault) {
      clack.log.warn('Another datasource is already marked default; leaving this one non-default.');
      makeDefault = false;
    }

    const { files, resolved, notes } = buildDatasourceFiles({
      name,
      dataSourcesDir: loaded.config.dataSourcesDir,
      urlEnv,
      generatedTypesImport: generatedImport,
      type: opts.type,
      default: makeDefault,
      prismaSchema: opts.prismaSchema,
      prismaConfig: opts.prismaConfig,
      zodOutput: opts.zodOutput,
      clientOutput: opts.clientOutput,
    });

    // Preview + collision check.
    const collisions: string[] = [];
    for (const f of files) {
      if (await fileExists(resolveFromRoot(loaded.root, f.path))) collisions.push(f.path);
    }
    clack.log.message(
      [
        pc.bold(`Datasource ${pc.cyan(resolved.name)}${resolved.default ? pc.dim(' (default)') : ''}`),
        ...files.map((f) => `${collisions.includes(f.path) ? pc.yellow('! ') : pc.green('+ ')}${f.path}`),
      ].join('\n'),
    );
    if (collisions.length) {
      clack.log.warn(`Existing files will NOT be overwritten: ${collisions.join(', ')}`);
    }

    if (opts.dryRun) {
      clack.outro(pc.yellow('Dry run — no files written.'));
      return;
    }

    const go = opts.yes
      ? true
      : (assertNotCancel(
          await clack.confirm({ message: `Write ${files.length - collisions.length} file(s)?`, initialValue: true }),
        ) as boolean);
    if (!go) throw new CancelledError();

    let written = 0;
    for (const f of files) {
      const abs = resolveFromRoot(loaded.root, f.path);
      if (await fileExists(abs)) continue; // never clobber
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, f.contents, 'utf-8');
      written += 1;
    }

    clack.log.success(`Wrote ${written} file(s).`);
    clack.log.message([pc.bold('Next steps:'), ...notes.map((n) => `  • ${n}`)].join('\n'));
    clack.outro(pc.green('Datasource scaffolded.'));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
