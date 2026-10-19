import type { ResourceJson } from '@ghentcdh/crouton-core';

type MigrationResult = { changed: boolean; json: ResourceJson };

/**
 * Moves the root-level `tag` field to `openapi.tag`.
 * Skips if `openapi` already exists (assume it was set intentionally).
 */
export const migrateOpenApiTag = (json: ResourceJson): MigrationResult => {
  const raw = json as any;
  if (!raw.tag || raw.openapi) return { changed: false, json };

  const { tag, ...rest } = raw;
  return {
    changed: true,
    json: { ...rest, openapi: { tag } } as unknown as ResourceJson,
  };
};
