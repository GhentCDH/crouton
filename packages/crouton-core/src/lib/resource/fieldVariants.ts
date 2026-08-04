import type { JsonColumn } from './Column';
import { type FieldInput, mergeFieldVariant } from './FieldInput.schema';

/**
 * Resolve the field config that drives each rendering context, applying the
 * `fieldInput → fieldView → fieldTable` fallback chain. These are the single
 * source of truth for the fallback; every consumer (transformer, view builders)
 * goes through them so the three-way behaviour can't drift.
 *
 *   form  ← fieldInput                    (base, unchanged)
 *   view  ← fieldView, then fieldInput
 *   table ← fieldTable, then fieldView, then fieldInput
 *
 * Merging is deep one level into `options` (see {@link mergeFieldVariant}).
 */
export const resolveFormField = (c: JsonColumn): FieldInput | undefined =>
  c.fieldInput;

export const resolveViewField = (c: JsonColumn): FieldInput | undefined =>
  mergeFieldVariant(c.fieldInput, c.fieldView);

export const resolveTableField = (c: JsonColumn): FieldInput | undefined =>
  mergeFieldVariant(resolveViewField(c), c.fieldTable);
