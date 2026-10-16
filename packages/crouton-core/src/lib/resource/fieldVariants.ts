import type { JsonColumn } from './Column';
import type { FieldInput } from './FieldInput.schema';

/**
 * Resolve the field config for each rendering context.
 *
 *   form  ← fieldInput
 *   view  ← fieldInput (use layout.view.items[].type/options for per-column view overrides)
 *   table ← fieldInput (use layout.table.items[].type/options for per-column table overrides)
 */
export const resolveFormField = (c: JsonColumn): FieldInput | undefined =>
  c.fieldInput;

export const resolveViewField = (c: JsonColumn): FieldInput | undefined =>
  c.fieldInput;

export const resolveTableField = (c: JsonColumn): FieldInput | undefined =>
  c.fieldInput;
