import type { ResourceJson } from '@ghentcdh/crouton-core';

type MigrationResult = { changed: boolean; json: ResourceJson };

/**
 * Moves top-level `calculatedColumns` entries to `columns[id].computed`.
 * Merges with existing column if one exists (preserves label, hiddenInTable, etc.).
 */
export const migrateCalculatedColumns = (json: ResourceJson): MigrationResult => {
  const raw = json as any;
  if (!raw.calculatedColumns?.length) return { changed: false, json };

  const { calculatedColumns, ...rest } = raw;
  const columns: Record<string, Record<string, unknown>> = { ...(rest.columns ?? {}) };

  for (const calc of calculatedColumns) {
    const existing = columns[calc.id] ?? {};
    columns[calc.id] = {
      ...existing,
      ...(calc.label && !existing.label ? { label: calc.label } : {}),
      ...(calc.hiddenInTable ? { hiddenInTable: calc.hiddenInTable } : {}),
      ...(calc.hiddenInView ? { hiddenInView: calc.hiddenInView } : {}),
      ...(calc.position !== undefined ? { position: calc.position } : {}),
      ...(calc.fieldInput ? { fieldInput: calc.fieldInput } : {}),
      computed: {
        sql: calc.sqlExpression,
        ...(calc.type && calc.type !== 'number' ? { type: calc.type } : {}),
      },
    };
  }

  return {
    changed: true,
    json: { ...rest, columns } as unknown as ResourceJson,
  };
};
