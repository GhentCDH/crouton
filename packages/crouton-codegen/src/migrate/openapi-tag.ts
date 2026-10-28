type RawResourceJson = Record<string, unknown>;
type MigrationResult = { changed: boolean; json: RawResourceJson };

export const migrateOpenApiTag = (json: RawResourceJson): MigrationResult => {
  if (!json['tag'] || json['openapi']) return { changed: false, json };
  const { tag, ...rest } = json;
  return { changed: true, json: { ...rest, openapi: { tag } } };
};
