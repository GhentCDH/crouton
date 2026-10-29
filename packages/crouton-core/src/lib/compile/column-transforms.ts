import type { JsonColumn } from '../resource';
import type { ValueLabelColumn } from './value-label-column';

export const applyRelationFormatDefault = (
  cols: JsonColumn[] | undefined,
): JsonColumn[] | undefined =>
  cols?.map((col) => {
    // New-style: col.relation present — ensure fieldInput.format is set for
    // backward-compat consumers that still read fieldInput.format
    if (col.relation && !col.fieldInput?.format) {
      return {
        ...col,
        fieldInput: { ...(col.fieldInput ?? {}), format: 'relation', resource: col.relation.resource },
      };
    }
    // Legacy: fieldInput.resource without format → set format: 'relation'
    const fi = col.fieldInput;
    if (fi && fi.resource && !fi.format && !fi.type) {
      return { ...col, fieldInput: { ...fi, format: 'relation' } };
    }
    return col;
  });

export const resolveColumnFieldVariants = (
  cols: JsonColumn[] | undefined,
): JsonColumn[] | undefined => cols;

/**
 * Resolve the value→label envelope columns for a set of (enriched) columns.
 *
 * Memoized per column array (WeakMap) so runtime callers (`crouton-api`
 * repositories) can derive the list from `config.columns` / `sub.columns` on
 * every request without rescanning `fieldInput.options` each time.
 *
 * Replaces the compiled `valueLabelColumns` projection: the compiled configs no
 * longer store the derived list; callers resolve it from the columns they carry.
 */
const valueLabelCache = new WeakMap<
  object,
  ValueLabelColumn[] | undefined
>();

export const resolveValueLabelColumns = (
  columns: JsonColumn[] | undefined,
): ValueLabelColumn[] | undefined => {
  if (!columns?.length) return undefined;
  if (valueLabelCache.has(columns)) return valueLabelCache.get(columns);
  const derived = buildValueLabelColumns(columns);
  const result = derived.length ? derived : undefined;
  valueLabelCache.set(columns, result);
  return result;
};

export const buildValueLabelColumns = (
  columns: JsonColumn[] | undefined,
): ValueLabelColumn[] =>
  (columns ?? []).flatMap((c) => {
    const opts = c.fieldInput?.options as
      | { emitObject?: boolean; values?: { value: unknown; label: string }[] }
      | undefined;
    if (!opts?.emitObject || !Array.isArray(opts.values)) return [];
    return [
      {
        field: c.column ?? c.id,
        values: opts.values,
        ...(c.enum && { enumName: c.enum }),
      },
    ];
  });
