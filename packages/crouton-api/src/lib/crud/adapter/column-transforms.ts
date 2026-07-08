import type { JsonColumn } from '@ghentcdh/crouton-core';

import { resolveChildResource } from './resource-resolver';
import type { ValueLabelColumn } from '../resource/valueLabel';

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

    const refColumns = resolved.json.columns; // normalizeColumns(resolved.json.columns) ?? [];
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

      // The more restrictive visibility wins (true = hidden beats false = visible)
      const hiddenInTable =
        col.hiddenInTable === true || refCol.hiddenInTable === true
          ? true
          : (col.hiddenInTable ?? refCol.hiddenInTable);
      const hiddenInForm =
        col.hiddenInForm === true || refCol.hiddenInForm === true
          ? true
          : (col.hiddenInForm ?? refCol.hiddenInForm);
      const hiddenInView =
        col.hiddenInView === true || refCol.hiddenInView === true
          ? true
          : (col.hiddenInView ?? refCol.hiddenInView);

      // Per-sub-column overrides keyed by virtual id or ref column id
      const override =
        col.columns?.[virtualId] ?? col.columns?.[refCol.id] ?? {};

      const virtualCol: JsonColumn = {
        id: virtualId,
        column: parentColumnKey,
        displayKey,
        label: refCol.label ?? refCol.id,
        columnType: 'object',
        ...(hiddenInTable !== undefined && { hiddenInTable }),
        ...(hiddenInForm !== undefined && { hiddenInForm }),
        ...(hiddenInView !== undefined && { hiddenInView }),
        ...(refCol.sortable != null && { sortable: refCol.sortable }),
        ...(refCol.fieldInput && { fieldInput: refCol.fieldInput }),
        ...override,
      };

      result.push(virtualCol);
    }
  }

  return result;
};

/**
 * Collect columns that should be serialized as `{ value, label }`: those whose
 * `fieldInput.options.emitObject` is true and that carry an `options.values`
 * list (typically enum/select columns).
 */
export const buildValueLabelColumns = (
  columns: JsonColumn[] | undefined,
): ValueLabelColumn[] =>
  (columns ?? []).flatMap((c) => {
    const opts = c.fieldInput?.options as
      | { emitObject?: boolean; values?: { value: unknown; label: string }[] }
      | undefined;
    if (!opts?.emitObject || !Array.isArray(opts.values)) return [];
    return [{ field: c.column ?? c.id, values: opts.values }];
  });

/**
 * Default `fieldInput.format` to `"relation"` for columns that reference a
 * resource (`fieldInput.resource`) but declare no explicit `format` or control
 * `type`. Such a column is a relation by convention, e.g.:
 *   `"fieldInput": { "resource": "../bibliography/resource.json", "options": { "displayKey": "bib" } }`
 * (A typed control that references a resource — `type: "select"`/`"autocomplete"` —
 * is left untouched.)
 */
export const applyRelationFormatDefault = (
  cols: JsonColumn[] | undefined,
): JsonColumn[] | undefined =>
  cols?.map((col) => {
    const fi = col.fieldInput;
    if (fi && fi.resource && !fi.format && !fi.type) {
      return { ...col, fieldInput: { ...fi, format: 'relation' } };
    }
    return col;
  });