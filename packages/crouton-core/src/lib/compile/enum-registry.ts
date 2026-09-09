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
    col.fieldInput.options = options;
  }
};
