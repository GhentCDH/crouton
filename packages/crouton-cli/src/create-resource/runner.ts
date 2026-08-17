/**
 * `crouton create-resource --kind custom` — scaffold a config-only resource:
 * `resources/<name>/{resource.json,repository.ts}`.
 *
 * Interactive by default, fully scriptable via flags. The file set comes from
 * the pure `buildCustomResourceFiles` engine helper; this runner only does I/O
 * and never overwrites an existing file.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import {
  buildCustomResourceFiles,
  loadConfig,
  resolveFromRoot,
} from '@ghentcdh/crouton-codegen';

import { CancelledError } from '../update/resolver';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve as pathResolve } from 'node:path';

export interface CreateResourceOptions {
  cwd?: string;
  name?: string;
  kind?: string;
  route?: string;
  tag?: string;
  title?: string;
  database?: string;
  idType?: string;
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

/** Resource directory names double as the resource `name`. */
const isValidName = (name: string): boolean => /^[a-z][a-z0-9_]*$/i.test(name);

export const runCreateResource = async (
  opts: CreateResourceOptions,
): Promise<void> => {
  const cwd = pathResolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('crouton create-resource'));

  try {
    if (opts.kind && opts.kind !== 'custom') {
      throw new Error(
        `Only --kind custom is supported. Prisma-backed resources are generated from the database with \`crouton update resources\`.`,
      );
    }

    const loaded = await loadConfig(cwd);

    const name = opts.name
      ? opts.name
      : (assertNotCancel(
          await clack.text({
            message: 'Resource name (directory + id)',
            placeholder: 'zotero_item',
            validate: (value) =>
              !value
                ? 'Required'
                : isValidName(value)
                  ? undefined
                  : 'Use letters, digits and underscores, starting with a letter.',
          }),
        ) as string);

    if (!isValidName(name)) {
      throw new Error(
        `Invalid resource name "${name}". Use letters, digits and underscores, starting with a letter.`,
      );
    }

    const idType =
      opts.idType ??
      (opts.yes
        ? 'string'
        : (assertNotCancel(
            await clack.select({
              message: 'Primary key type',
              options: [
                { value: 'string', label: 'string' },
                { value: 'number', label: 'number' },
              ],
              initialValue: 'string',
            }),
          ) as string));

    if (idType !== 'string' && idType !== 'number') {
      throw new Error(`--id-type must be "string" or "number", got "${idType}".`);
    }

    const { files, notes } = buildCustomResourceFiles({
      name,
      route: opts.route,
      tag: opts.tag,
      title: opts.title,
      database: opts.database,
      idType,
      resourcesDir: loaded.config.resourcesDir,
    });

    // Preview + collision check.
    const collisions: string[] = [];
    for (const f of files) {
      if (await fileExists(resolveFromRoot(loaded.root, f.path))) {
        collisions.push(f.path);
      }
    }
    clack.log.message(
      [
        pc.bold(`Custom resource ${pc.cyan(name)}`),
        ...files.map(
          (f) =>
            `${collisions.includes(f.path) ? pc.yellow('! ') : pc.green('+ ')}${f.path}`,
        ),
      ].join('\n'),
    );
    if (collisions.length) {
      clack.log.warn(
        `Existing files will NOT be overwritten: ${collisions.join(', ')}`,
      );
    }

    if (opts.dryRun) {
      clack.outro(pc.yellow('Dry run — no files written.'));
      return;
    }

    const go = opts.yes
      ? true
      : (assertNotCancel(
          await clack.confirm({
            message: `Write ${files.length - collisions.length} file(s)?`,
            initialValue: true,
          }),
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
    clack.log.message(
      [pc.bold('Next steps:'), ...notes.map((n) => `  • ${n}`)].join('\n'),
    );
    clack.outro(pc.green('Resource scaffolded.'));
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
