type RawResourceJson = Record<string, unknown>;
type MigrationResult = { changed: boolean; json: RawResourceJson };

export const migrateCalculatedColumns = (json: RawResourceJson): MigrationResult => {
  const calculatedColumns = json['calculatedColumns'];
  if (!Array.isArray(calculatedColumns) || !calculatedColumns.length) return { changed: false, json };

  const { calculatedColumns: _cc, ...rest } = json;
  const columns: Record<string, Record<string, unknown>> = {
    ...((rest['columns'] as Record<string, Record<string, unknown>> | undefined) ?? {}),
  };

  for (const calc of calculatedColumns as Record<string, unknown>[]) {
    const id = calc['id'] as string;
    const existing = columns[id] ?? {};
    columns[id] = {
      ...existing,
      ...(calc['label'] && !existing['label'] ? { label: calc['label'] } : {}),
      ...(calc['hiddenInTable'] ? { hiddenInTable: calc['hiddenInTable'] } : {}),
      ...(calc['hiddenInView'] ? { hiddenInView: calc['hiddenInView'] } : {}),
      ...(calc['position'] !== undefined ? { position: calc['position'] } : {}),
      ...(calc['fieldInput'] ? { fieldInput: calc['fieldInput'] } : {}),
      computed: {
        sql: calc['sqlExpression'],
        ...(calc['type'] && calc['type'] !== 'number' ? { type: calc['type'] } : {}),
      },
    };
  }

  return { changed: true, json: { ...rest, columns } };
};
