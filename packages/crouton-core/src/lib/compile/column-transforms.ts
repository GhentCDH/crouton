import type { JsonColumn } from '../resource';
import { resolveTableField, resolveViewField } from '../resource';

import type { ValueLabelColumn } from './value-label-column';

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

export const resolveColumnFieldVariants = (
  cols: JsonColumn[] | undefined,
): JsonColumn[] | undefined =>
  cols?.map((col) => {
    const fieldView = resolveViewField(col);
    const fieldTable = resolveTableField(col);
    return {
      ...col,
      ...(fieldView && { fieldView }),
      ...(fieldTable && { fieldTable }),
    };
  });

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
