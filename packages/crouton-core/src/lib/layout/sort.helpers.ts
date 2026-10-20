import { resolveTableNode } from './layout-table-order';
import type { LayoutNode } from './schema';
import type { JsonColumn } from '../resource/Column';

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
    col.relation !== undefined ||
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
 * Pick the default sort column and direction.
 * When `defaultSort` is set on the table node, uses its `field`+`sortDir`.
 * Otherwise falls back to the first sortable column, then the idField column.
 */
export const resolveDefaultSort = (
  tableCols: JsonColumn[],
  allColumns: JsonColumn[] | undefined,
  tableLayout?: LayoutNode,
): { id: string; dir: 'asc' | 'desc' } | undefined => {
  const tableNode = resolveTableNode(tableLayout) ?? tableLayout;
  const ds = (tableNode as Record<string, unknown>)?.defaultSort as
    | { field?: string; sortDir?: 'asc' | 'desc' }
    | undefined;

  if (ds) {
    const fieldId = ds.field ?? 'id';
    const dir: 'asc' | 'desc' = ds.sortDir ?? 'asc';
    const allCols = [...(tableCols ?? []), ...(allColumns ?? [])];
    const sortCol = allCols.find((c) => c.id === fieldId) ?? allColumns?.find((c) => c.idField);
    if (!sortCol) return undefined;
    return { id: deriveSortId(sortCol) ?? sortCol.id, dir };
  }

  // No explicit defaultSort — find first sortable column, then idField as last resort.
  const items = (tableNode as { items?: unknown[] })?.items ?? [];
  const isSortable = (c: JsonColumn) => {
    for (const ctrl of items) {
      if (typeof ctrl === 'string') continue;
      if ('component' in (ctrl as object)) continue;
      const fc = ctrl as { id?: string; sortable?: boolean };
      if (fc.id === c.id) return fc.sortable ?? false;
    }
    return false;
  };
  const sortCol =
    tableCols.find(isSortable) ??
    allColumns?.find((c) => c.idField);
  if (!sortCol) return undefined;
  return { id: deriveSortId(sortCol) ?? sortCol.id, dir: 'asc' };
};
