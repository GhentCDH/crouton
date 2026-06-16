/**
 * Project-level enum registry (`crouton.enums.json`): the single source of
 * `{ value, label }` option lists for enum columns. Columns reference an enum
 * by name (`JsonColumn.enum`); at load time the referenced list is injected
 * into `fieldInput.options.values`, so no column duplicates the labels.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { JsonColumn } from './json-config.types';

export type EnumRegistry = Record<string, { value: unknown; label: string }[]>;

const ENUMS_FILE = 'crouton.enums.json';

/**
 * Load the enum registry: an explicit `enumsFile` path if given, otherwise the
 * first `crouton.enums.json` found by walking up from `startDir` (the resources
 * dir). Returns `{}` when none exists.
 */
export const loadEnumRegistry = (startDir: string, enumsFile?: string): EnumRegistry => {
  let file = enumsFile;
  if (!file) {
    let dir = startDir;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = join(dir, ENUMS_FILE);
      if (existsSync(candidate)) {
        file = candidate;
        break;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  if (!file || !existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as EnumRegistry;
  } catch {
    return {};
  }
};

/**
 * Inject registry option lists into columns that reference an enum by name.
 * Mutates each matching column's `fieldInput.options.values` (only when not
 * already present, so an inline override still wins).
 */
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
    const options = (col.fieldInput.options as Record<string, unknown> | undefined) ?? {};
    if (!('values' in options)) options.values = values;
    col.fieldInput.options = options;
  }
};
