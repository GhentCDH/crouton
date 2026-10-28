type RawResourceJson = Record<string, unknown>;
type MigrationResult = { changed: boolean; json: RawResourceJson };

export const migrateRootInclude = (json: RawResourceJson): MigrationResult => {
  const include = json['include'];
  if (!Array.isArray(include) || !include.length) return { changed: false, json };

  const { include: _removed, ...rest } = json;
  const ops = (rest['operations'] as Record<string, unknown> | undefined) ?? {};
  const findAll = typeof ops['findAll'] === 'object' && ops['findAll'] !== null
    ? { ...(ops['findAll'] as Record<string, unknown>), include }
    : { include };
  const findOne = typeof ops['findOne'] === 'object' && ops['findOne'] !== null
    ? { ...(ops['findOne'] as Record<string, unknown>), include }
    : { include };

  return {
    changed: true,
    json: { ...rest, operations: { ...ops, findAll, findOne } },
  };
};
