import { z } from 'zod';

import type { JsonColumn } from '../resource';

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
export const applyEnumDefaults = (col: JsonColumn, values?: EnumEntry[]): void => {
  col.fieldInput = col.fieldInput ?? {};
  if (!col.fieldInput.type) col.fieldInput.type = 'select';

  const options = (col.fieldInput.options as Record<string, unknown> | undefined) ?? {};

  if (!('emitObject' in options)) options.emitObject = true;
  if (!('labelKey' in options)) options.labelKey = 'label';
  if (!('valueKey' in options)) options.valueKey = 'value';
  if (values !== undefined && !('values' in options) && !('options' in options)) {
    options.values = values;
  }

  col.fieldInput.options = options;

  if (options.emitObject !== false && !col.displayKey) {
    col.displayKey = options.labelKey as string;
  }
};

/** Plain scalars allowed as shorthand option entries ("internal", 42, true). */
const PLAIN_OPTION_TYPES = ['string', 'number', 'boolean'];

const isOptionObject = (entry: unknown): entry is Record<string, unknown> =>
  !!entry && typeof entry === 'object' && !Array.isArray(entry);

/**
 * When a column references a shared `enum` AND declares a local `fieldInput.options.values`
 * (or `options`) list, the local list *restricts* the shared enum for that screen.
 * Normalise local entries so labels come from the enum registry:
 *
 * - `"internal"`            → `{ value: "internal", label: <label from the enum> }`
 * - `{ value: "wikidata" }` → label filled in from the enum
 * - `{ value, label }`      → the explicit local label is kept as-is
 *
 * Values that are not part of the enum are kept (data still round-trips) and a single
 * warning naming the column, enum and offending values is emitted. Local lists where
 * every entry already carries a label are left untouched.
 */
export const applyLocalEnumRestriction = (
  col: JsonColumn,
  enumValues: EnumEntry[],
): void => {
  const options = (col.fieldInput?.options ?? {}) as Record<string, unknown>;
  const keys = (['values', 'options'] as const).filter(
    (k) => Array.isArray(options[k]) && (options[k] as unknown[]).length > 0,
  );
  if (!keys.length) return;

  const labelByKey = new Map(enumValues.map((e) => [String(e.value), e.label]));
  const unknownValues: unknown[] = [];

  for (const key of keys) {
    const local = options[key] as unknown[];
    // Fully labelled { value, label } objects need no resolving.
    if (local.every((e) => isOptionObject(e) && 'label' in e)) continue;

    options[key] = local.map((entry) => {
      if (PLAIN_OPTION_TYPES.includes(typeof entry)) {
        const label = labelByKey.get(String(entry));
        if (label === undefined) {
          unknownValues.push(entry);
          return { value: entry, label: String(entry) };
        }
        return { value: entry, label };
      }
      if (isOptionObject(entry) && !('label' in entry)) {
        const label = labelByKey.get(String(entry['value']));
        if (label === undefined) {
          unknownValues.push(entry['value']);
          return { ...entry };
        }
        return { ...entry, label };
      }
      return entry;
    });
  }

  if (unknownValues.length) {
    console.warn(
      `[crouton] column "${col.id}": ${unknownValues.map(String).join(', ')} not found in enum "${col.enum}" — falling back to the raw value as label`,
    );
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
      console.warn(`[crouton] enum "${col.enum}" not found in crouton.enums.json`);
    } else {
      applyLocalEnumRestriction(col, values);
    }
    applyEnumDefaults(col, values);
  }
};
