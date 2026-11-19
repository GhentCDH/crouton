/**
 * `crouton migrate` file I/O: read a raw resource.json, run a codemod chain, validate,
 * and write it back byte-stably (same `serializeResourceJson` + `withResourceHeader`
 * the API's dev auto-migration uses). Nothing is written when the result is invalid.
 */

import {
  type Codemod,
  RESOURCE_CODEMODS,
  buildResourceJsonSchema,
  runCodemods,
  serializeResourceJson,
  withResourceHeader,
} from '@ghentcdh/crouton-core';

import { readFile, writeFile } from 'node:fs/promises';

export type MigrateFileOutcome =
  | { status: 'current'; file: string }
  | { status: 'migrated'; file: string; applied: string[]; written: boolean }
  | { status: 'failed'; file: string; applied: string[]; error: string };

export const migrateResourceFile = async (
  file: string,
  opts: { chain?: Codemod[]; dryRun?: boolean } = {},
): Promise<MigrateFileOutcome> => {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(await readFile(file, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    return { status: 'failed', file, applied: [], error: `cannot read: ${(err as Error).message}` };
  }

  const { raw: migrated, applied } = runCodemods(raw, opts.chain ?? RESOURCE_CODEMODS);
  const output = serializeResourceJson(withResourceHeader(migrated));
  // Header stamping ($schema / schemaVersion) counts as a change; formatting alone does not.
  if (output === serializeResourceJson(raw)) return { status: 'current', file };

  const result = buildResourceJsonSchema().safeParse(migrated);
  if (!result.success) {
    const issues = result.error.issues.map((i) => {
      const path = i.path.join('.') || '<root>';
      // Old relations could rely on the Prisma relation alone; a resource is now required (#598).
      const hint = /^columns\.[^.]+\.relation\.resource$/.test(path)
        ? ' — add "resource" pointing at the related resource.json (e.g. "../customer/resource.json")'
        : '';
      return `${path}: ${i.message}${hint}`;
    });
    const rules = applied.length ? ` (after rules: ${applied.join(', ')})` : '';
    return { status: 'failed', file, applied, error: `${issues.join('; ')}${rules}` };
  }

  if (!opts.dryRun) await writeFile(file, output, 'utf-8');
  const header = applied.length ? applied : ['add $schema / schemaVersion'];
  return { status: 'migrated', file, applied: header, written: !opts.dryRun };
};
