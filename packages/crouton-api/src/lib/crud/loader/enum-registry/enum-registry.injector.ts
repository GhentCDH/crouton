import type { JsonColumn } from '../json-config.types';

import { type EnumRegistry } from './enum-registry.types';

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