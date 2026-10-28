type RawResourceJson = Record<string, unknown>;
type MigrationResult = { changed: boolean; json: RawResourceJson };

export const migrateLookupLabels = (json: RawResourceJson): MigrationResult => {
  const rawCols = json['columns'];
  const columns = Array.isArray(rawCols)
    ? (rawCols as Array<Record<string, unknown>>)
    : undefined;
  if (!columns?.length) return { changed: false, json };

  const hasLegacy = columns.some((c) => c['showInLookup'] === true);
  if (!hasLegacy) {
    const stripped = columns.map(({ showInLookup: _, ...rest }) => rest);
    const changed = columns.some((c) => 'showInLookup' in c);
    return { changed, json: { ...json, columns: stripped } };
  }

  const labels = columns
    .filter((c) => c['showInLookup'] === true)
    .map((c) => c['id'] as string);

  const cleanedColumns = columns.map(({ showInLookup: _, ...rest }) => rest);

  return {
    changed: true,
    json: {
      ...json,
      lookup: { ...(json['lookup'] as Record<string, unknown> | undefined), labels },
      columns: cleanedColumns,
    },
  };
};
