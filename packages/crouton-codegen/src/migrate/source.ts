type RawResourceJson = Record<string, unknown>;
type MigrationResult = { changed: boolean; json: RawResourceJson };

const SOURCE_KEYS = ['model', 'table', 'database', 'idType'] as const;

export const migrateSource = (json: RawResourceJson): MigrationResult => {
  const keysPresent = SOURCE_KEYS.filter((k) => json[k] !== undefined);
  if (!keysPresent.length) return { changed: false, json };

  const extracted: Record<string, unknown> = {};
  const rest: Record<string, unknown> = { ...json };
  for (const k of keysPresent) {
    extracted[k] = rest[k];
    delete rest[k];
  }

  return {
    changed: true,
    json: {
      ...rest,
      source: {
        ...(rest['source'] as Record<string, unknown> | undefined),
        ...extracted,
      },
    },
  };
};
