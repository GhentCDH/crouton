import { z } from 'zod';

import type { JsonColumn } from '../resource';

const EnumEntrySchema = z.object({
  value: z.unknown(),
  label: z.string(),
});

export type EnumEntry = z.infer<typeof EnumEntrySchema>;

export const EnumRegistrySchema = z
  .record(z.string(), z.array(EnumEntrySchema))
  .default({});

export type EnumRegistry = z.infer<typeof EnumRegistrySchema>;

export const injectEnumValues = (
  columns: JsonColumn[] | undefined,
  enums: EnumRegistry,
): void => {
  if (!columns) return;
  for (const col of columns) {
    if (!col.enum) continue;
    const values = enums[col.enum];
    if (!values) continue;
    col.fieldInput = col.fieldInput ?? { type: 'select' };
    const options =
      (col.fieldInput.options as Record<string, unknown> | undefined) ?? {};
    if (!('values' in options)) options.values = values;
    if (!('emitObject' in options)) options.emitObject = true;
    if (!('displayKey' in options)) options.displayKey = 'label';
    col.fieldInput.options = options;
    // Propagate displayKey to the column level so the table cell extracts
    // the right key from the {value, label} envelope emitted by the API.
    if (options.emitObject !== false && !col.displayKey) {
      col.displayKey = options.displayKey as string;
    }
  }
};
