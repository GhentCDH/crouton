import type { JsonColumn } from '@ghentcdh/crouton-core';

// ── Sort helpers ──────────────────────────────────────────────────────────

/**
 * Derive the sort key for a column:
 * - Explicit `sortId` wins.
 * - Value/label enum column (`enum` ref or `options.emitObject`): sort by the
 *   scalar column, NOT `${column}.label` — the label is a serialization
 *   envelope, not a DB field, so a nested orderBy would be invalid.
 * - Nested relation column: `${column ?? id}.${displayKey}` (e.g. `author.origin_name`).
 * - Plain column: `col.id`.
 * Returns `null` when `sortable: false`.
 */
export const deriveSortId = (col: JsonColumn): string | null => {
  if (col.sortable === false) return null;
  if (col.sortId) return col.sortId;
  const base = col.column ?? col.id;
  const fi = col.fieldInput;
  const opts = (fi?.options ?? {}) as Record<string, unknown>;

  // Relation columns (autocomplete / `format: relation`) can't be ordered by the
  // bare relation name — Prisma expects a nested `…OrderByWithRelationInput`, not
  // a scalar. Sort by a nested scalar of the related model instead, preferring an
  // explicit `displayKey`, then the autocomplete label/display key. With no usable
  // key the column is not sortable (`null`) rather than crashing at query time.
  const isRelation =
    fi?.format === 'relation' ||
    !!fi?.relationType ||
    fi?.type === 'autocomplete' ||
    typeof opts.resource === 'string';
  if (isRelation) {
    const key =
      (typeof col.displayKey === 'string' ? col.displayKey : undefined) ??
      (typeof opts.displayKey === 'string' ? opts.displayKey : undefined) ??
      (typeof opts.labelKey === 'string' ? opts.labelKey : undefined);
    if (!key) return null;
    const path = key.includes('.') ? key : `${base}.${key}`;
    return path.endsWith('.label') ? path.slice(0, -'.label'.length) : path;
  }

  if (!col.displayKey) return base;
  const path = `${base}.${col.displayKey}`;
  const isValueLabel =
    !!col.enum ||
    (opts as { emitObject?: boolean }).emitObject === true;
  // For value-label columns the displayKey targets the `{value,label}` envelope,
  // which is not a DB field. Sort by the underlying scalar: drop a trailing
  // `.label` while keeping any relation path (e.g. `author.origin.label` →
  // `author.origin`, `text_type.label` → `text_type`).
  if (isValueLabel && path.endsWith('.label')) return path.slice(0, -'.label'.length);
  return path;
};

/**
 * Pick the best default sort column:
 * 1. Explicit `defaultSort: true` column that is also sortable.
 * 2. First sortable visible column.
 * 3. The idField column as a last resort.
 */
export const resolveDefaultSort = (
  tableCols: JsonColumn[],
  allColumns: JsonColumn[] | undefined,
): string | undefined => {
  const isSortable = (c: JsonColumn) => c.sortable !== false;
  const sortCol =
    tableCols.find((c) => c.defaultSort && isSortable(c)) ??
    tableCols.find(isSortable) ??
    allColumns?.find((c) => c.idField);
  return sortCol ? (deriveSortId(sortCol) ?? sortCol.id) : undefined;
};