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
    const error = result.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; ');
    return { status: 'failed', file, applied, error };
  }

  if (!opts.dryRun) await writeFile(file, output, 'utf-8');
  const header = applied.length ? applied : ['add $schema / schemaVersion'];
  return { status: 'migrated', file, applied: header, written: !opts.dryRun };
};
