import type { JsonColumn } from './Column';
import { type FieldInput, mergeFieldVariant } from './FieldInput.schema';

/**
 * Resolve the field config for each rendering context.
 *
 *   form  ← fieldInput
 *   view  ← fieldView, then fieldInput
 *   table ← fieldView, then fieldInput (fieldTable removed; use layout.table.controls[].type/options)
 */
export const resolveFormField = (c: JsonColumn): FieldInput | undefined =>
  c.fieldInput;

export const resolveViewField = (c: JsonColumn): FieldInput | undefined =>
  mergeFieldVariant(c.fieldInput, c.fieldView);

export const resolveTableField = (c: JsonColumn): FieldInput | undefined =>
  resolveViewField(c);
