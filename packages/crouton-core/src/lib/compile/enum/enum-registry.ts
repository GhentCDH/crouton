import { z } from 'zod';

import type { JsonColumn } from '../../resource';

export const EnumEntrySchema = z.object({
  value: z.unknown(),
  label: z.string(),
});

export type EnumEntry = z.infer<typeof EnumEntrySchema>;

export const EnumRegistrySchema = z
  .record(z.string(), z.array(EnumEntrySchema))
  .default({});

export type EnumRegistry = z.infer<typeof EnumRegistrySchema>;

/**
 * Pure function — applies enum defaults to a single column.
 * `values` is undefined when the enum name was not found in the registry;
 * all other defaults (type, labelKey, valueKey, emitObject) are applied regardless.
 */
export const applyEnumDefaults = (
  col: JsonColumn,
  values?: EnumEntry[],
): void => {
  col.fieldInput = col.fieldInput ?? {};
  if (!col.fieldInput.type) col.fieldInput.type = 'select';

  const options =
    (col.fieldInput.options as Record<string, unknown> | undefined) ?? {};

  if (!('emitObject' in options)) options.emitObject = true;
  if (!('labelKey' in options)) options.labelKey = 'label';
  if (!('valueKey' in options)) options.valueKey = 'value';
  if (
    values !== undefined &&
    !('values' in options) &&
    !('options' in options)
  ) {
    options.values = values;
  }

  col.fieldInput.options = options;

  if (options.emitObject !== false && !col.displayKey) {
    col.displayKey = options.labelKey as string;
  }
};

export const injectEnumValues = (
  columns: JsonColumn[] | undefined,
  enums: EnumRegistry,
): void => {
  if (!columns) return;
  for (const col of columns) {
    if (!col.enum) continue;
    const values = enums[col.enum];
    if (!values) {
      console.warn(
        `[crouton] enum "${col.enum}" not found in crouton.enums.json`,
      );
    }
    applyEnumDefaults(col, values);
  }
};
