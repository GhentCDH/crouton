type RawResourceJson = Record<string, unknown>;
type MigrationResult = { changed: boolean; json: RawResourceJson };

export const migrateRootId = (json: RawResourceJson): MigrationResult => {
  if (!('id' in json) || json['id'] !== json['name']) return { changed: false, json };
  const { id: _removed, ...rest } = json;
  return { changed: true, json: rest };
};
