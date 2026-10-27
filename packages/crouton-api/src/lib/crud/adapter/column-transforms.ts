import { type JsonColumn } from '@ghentcdh/crouton-core';

import { resolveChildResource } from './resource-resolver';

/**
 * Expand columns that declare `extend` into virtual sub-columns derived from the
 * referenced resource.json.
 *
 * Each non-id column in the referenced resource becomes a virtual column:
 *   id         → `{extendColId}_{refColId}`
 *   column     → the extending column's `column` value (or its `id`)
 *   displayKey → the referenced column's `displayKey` or its `id`
 *   label      → the referenced column's label
 *
 * Visibility is the union of the extending column's visibility and the referenced
 * column's own visibility — the more restrictive setting wins.
 * Optional `columns` map on the extending column lets you override individual sub-columns.
 */
export const expandExtendColumns = (
  columns: JsonColumn[],
  dirPath: string | undefined,
): JsonColumn[] => {
  if (!dirPath) return columns;

  const result: JsonColumn[] = [];
  for (const col of columns) {
    if (!col.extend) {
      result.push(col);
      continue;
    }

    const resolved = resolveChildResource(col.extend, dirPath);
    if (!resolved) {
      console.warn(
        `[extend] Could not resolve "${col.extend}" for column "${col.id}" — keeping as-is`,
      );
      result.push(col);
      continue;
    }

    const refColumns = resolved.json.columns ?? [];
    const parentColumnKey = col.column ?? col.id;

    for (const refCol of refColumns) {
      // Skip primary key fields
      if (refCol.idField) continue;

      const virtualId = `${col.id}_${refCol.id}`;
      // When refCol has a displayKey (e.g. internal_author.displayKey = "name"), the value
      // lives at refCol.id.displayKey within the parent column object. Build the full dotted
      // path so scopes and table keys navigate correctly: "internal_author.name".
      // For plain scalar columns with no displayKey the path is just refCol.id.
      const displayKey = refCol.displayKey
        ? `${refCol.id}.${refCol.displayKey}`
        : refCol.id;

      const hiddenInForm =
        col.hiddenInForm === true || refCol.hiddenInForm === true
          ? true
          : (col.hiddenInForm ?? refCol.hiddenInForm);

      // Per-sub-column overrides keyed by virtual id or ref column id
      const override =
        col.columns?.[virtualId] ?? col.columns?.[refCol.id] ?? {};

      const virtualCol = {
        id: virtualId,
        column: parentColumnKey,
        displayKey,
        label: refCol.label ?? refCol.id,
        type: 'object',
        ...(hiddenInForm !== undefined && { hiddenInForm }),
        ...(refCol.fieldInput && { fieldInput: refCol.fieldInput }),
        ...override,
      } as unknown as JsonColumn;

      result.push(virtualCol as JsonColumn);
    }
  }

  return result;
};
