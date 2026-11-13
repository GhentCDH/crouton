/**
 * `crouton create resource --kind custom` — scaffold a config-only resource:
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
  loadDatasources,
} from '@ghentcdh/crouton-codegen';
import { labelFromId } from '@ghentcdh/crouton-core';

import { CancelledError, assertNotCancel } from '../prompts';
import { writeScaffoldFiles } from '../scaffold/scaffold-files';
import { resolve as pathResolve } from 'node:path';

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

/** Resource directory names double as the resource `name`. */
const isValidName = (name: string): boolean => /^[a-z][a-z0-9_]*$/i.test(name);

export const runCreateResource = async (
  opts: CreateResourceOptions,
): Promise<void> => {
  const cwd = pathResolve(opts.cwd ?? process.cwd());
  clack.intro(pc.bold('crouton create resource'));

  try {
    if (opts.kind && opts.kind !== 'custom') {
      throw new Error(
        'Only --kind custom is supported. Prisma-backed resources are generated from the database with `crouton update resources`.',
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

    /** Flag wins; `-y` keeps the derived default; otherwise ask with the default prefilled (blank = default). */
    const ask = async (flag: string | undefined, message: string, initialValue: string) => {
      if (flag !== undefined || opts.yes) return flag;
      const value = (assertNotCancel(await clack.text({ message, initialValue })) as string | undefined)?.trim();
      return value || undefined;
    };

    const label = labelFromId(name);
    const route = await ask(opts.route, 'URL route segment', name);
    const tag = await ask(opts.tag, 'OpenAPI tag', label);
    const title = await ask(opts.title, 'UI title', label);

    let database = opts.database;
    if (database === undefined && !opts.yes) {
      const datasources = await loadDatasources(loaded).catch(() => []);
      if (datasources.length > 0) {
        const picked = assertNotCancel<string>(
          await clack.select<string>({
            message: 'Datasource exposed to the repository as ctx.prisma',
            options: [
              { value: '', label: 'none', hint: 'implement data access yourself' },
              ...datasources.map((d) => ({ value: d.name, label: d.name, hint: d.default ? 'default' : undefined })),
            ],
            initialValue: '',
          }),
        );
        database = picked || undefined;
      }
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
      route,
      tag,
      title,
      database,
      idType,
      resourcesDir: loaded.config.resourcesDir,
    });

    await writeScaffoldFiles({
      root: loaded.root,
      title: `Custom resource ${pc.cyan(name)}`,
      files,
      notes,
      dryRun: opts.dryRun,
      yes: opts.yes,
      doneLabel: 'Resource',
    });
  } catch (err) {
    if (err instanceof CancelledError) {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
