import type { ResourceJson } from '@ghentcdh/crouton-core';

type MigrationResult = { changed: boolean; json: ResourceJson };

const SOURCE_KEYS = ['model', 'table', 'database', 'idType'] as const;

/**
 * Moves root-level model/table/database/idType to the `source` object.
 */
export const migrateSource = (json: ResourceJson): MigrationResult => {
  const raw = json as any;
  const keysPresent = SOURCE_KEYS.filter((k) => raw[k] !== undefined);
  if (!keysPresent.length) return { changed: false, json };

  const extracted: Record<string, unknown> = {};
  const rest: Record<string, unknown> = { ...raw };
  for (const k of keysPresent) {
    extracted[k] = rest[k];
    delete rest[k];
  }

  return {
    changed: true,
    json: {
      ...rest,
      source: {
        ...(rest.source as object | undefined),
        ...extracted,
      },
    } as unknown as ResourceJson,
  };
};
