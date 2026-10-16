import type { ResourceJson } from '@ghentcdh/crouton-core';

type MigrationResult = { changed: boolean; json: ResourceJson };

/**
 * Moves per-column `showInLookup: true` to the resource-level `lookup.labels` array.
 * Removes `showInLookup` from all columns after migration.
 */
export const migrateLookupLabels = (json: ResourceJson): MigrationResult => {
  const columns = json.columns as Array<Record<string, unknown>> | undefined;
  if (!columns?.length) return { changed: false, json };

  const hasLegacy = columns.some((c) => c['showInLookup'] === true);
  if (!hasLegacy) {
    // Still strip showInLookup: false entries to clean up noise
    const stripped = columns.map(({ showInLookup: _, ...rest }) => rest as Record<string, unknown>);
    const changed = columns.some((c) => 'showInLookup' in c);
    return { changed, json: { ...json, columns: stripped as any } };
  }

  const labels = columns
    .filter((c) => c['showInLookup'] === true)
    .map((c) => c['id'] as string);

  const cleanedColumns = columns.map(({ showInLookup: _, ...rest }) => rest as Record<string, unknown>);

  const result: ResourceJson = {
    ...json,
    lookup: {
      ...(json as any).lookup,
      labels,
    },
    columns: cleanedColumns as any,
  };

  return { changed: true, json: result };
};
