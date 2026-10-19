import type { ResourceJson } from '@ghentcdh/crouton-core';

type MigrationResult = { changed: boolean; json: ResourceJson };

/**
 * Removes root `id` when it equals `name` (the default value).
 * When `id !== name` the field is left untouched — it has a meaningful override.
 */
export const migrateRootId = (json: ResourceJson): MigrationResult => {
  const raw = json as any;
  if (!('id' in raw) || raw.id !== raw.name) return { changed: false, json };

  const { id: _removed, ...rest } = raw;
  return { changed: true, json: rest as unknown as ResourceJson };
};
