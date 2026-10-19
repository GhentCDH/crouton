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
