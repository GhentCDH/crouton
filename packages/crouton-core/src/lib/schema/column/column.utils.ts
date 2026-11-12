import { columnKey } from '@crouton/i18n';

import type { JsonColumn } from '../../resource/Column';
import type { ViewColumnConfig } from '../view/view.schema';

export type FieldContext = 'form' | 'view' | 'table';

/**
 * Return a copy of the column whose `fieldInput` is the resolved variant for the
 * given rendering context, so downstream builders (which all read `fieldInput`)
 * render the right config without any signature change.
 *
 * After the transformer's `resolveColumnFieldVariants` prefill, `fieldView` and
 * `fieldTable` are already the fully-resolved variants; the `?? col.fieldInput`
 * guard covers TS-authored `resource.ts` resources that bypass the transformer.
 */
export const columnForContext = (
  col: JsonColumn,
  ctx: FieldContext,
): JsonColumn => {
  if (ctx === 'table') return col; // table type/options overrides come from layout.table.controls
  return col; // form / view / filter → base fieldInput
};

export const toViewColumn = (
  col: JsonColumn,
  resourceName?: string,
): ViewColumnConfig => ({
  id: col.id,
  ...(col.label && { label: col.label }),
  labelKey:
    col.labelKey ??
    (resourceName ? columnKey(resourceName, col.id) : undefined),
  ...(col.fieldInput && { fieldInput: col.fieldInput }),
  ...(col.enum && { enumName: col.enum }),
});
