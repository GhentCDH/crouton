import type { ZodObject, ZodRawShape, ZodType } from 'zod';

import type { JsonColumn, RelationFieldInputOptions } from '../resource';
import { isRelationColumn } from '../resource/Column';
import { columnTypeName, columnTypeToJsonSchema } from '../resource/ColumnType.schema';
import type { LookupConfig } from '../schema/definition/lookup.schema';
import { unwrap } from '../schema/zod.utils';

/** Field inputs that always sit on a string column (a `select` may be a Prisma enum). */
const TEXT_FIELD_INPUTS = new Set(['string', 'text', 'textarea', 'markdown']);

/** Text columns only: a `contains` search on a number/boolean/enum column makes Prisma throw (#594). */
const isTextColumn = (c: JsonColumn, modelSchema?: ZodObject<ZodRawShape>): boolean => {
  const input = c.fieldInput?.type;
  if (input) return TEXT_FIELD_INPUTS.has(input);
  // Untyped column (`"name": {}`): the type comes from the Prisma model's Zod schema.
  if (c.type === undefined) {
    const field = modelSchema?.shape[c.id];
    if (!field) return false;
    // A Prisma String column, whatever its format; enums/numbers/dates are other types.
    return unwrap(field as ZodType)._zod.def.type === 'string';
  }
  const schema = columnTypeToJsonSchema(c.type);
  return columnTypeName(c.type) === 'string' && !schema.format && !schema.enum;
};

const isSearchableColumn = (c: JsonColumn, modelSchema?: ZodObject<ZodRawShape>): boolean =>
  !c.idField &&
  !c.computed &&
  !isRelationColumn(c) &&
  !c.fieldInput?.relationType &&
  isTextColumn(c, modelSchema);

export const buildSearch = (
  columns: JsonColumn[] | undefined,
  searchPaths: string[] | undefined,
  findAllEnabled = false,
  /** Prisma model schema, used to type columns that declare no `type` / `fieldInput`. */
  schema?: ZodObject<ZodRawShape>,
): string[] | undefined => {
  if (!columns) return undefined;
  // An explicit `search: []` disables free-text search.
  if (searchPaths?.length === 0) return undefined;
  if (!searchPaths) {
    if (!findAllEnabled) return undefined;
    const fallback = columns.filter((c) => isSearchableColumn(c, schema)).map((c) => c.id);
    return fallback.length ? fallback : undefined;
  }
  return searchPaths
    .flatMap((id) => {
      const col = columns.find((c) => c.id === id);
      if (!col) return [id];
      if (col.computed) return [];
      if (isRelationColumn(col) && col.fieldInput?.format === 'relation') {
        const opts = col.fieldInput.options as RelationFieldInputOptions | undefined;
        if (opts?.displayKey) return [`${id}.${opts.displayKey}`];
      }
      if (col.relation !== undefined || col.fieldInput?.relationType === 'manyToOne') {
        const displayKey =
          col.displayKey ??
          (col.fieldInput?.options as RelationFieldInputOptions | undefined)?.displayKey;
        if (displayKey) return [`${id}.${displayKey}`];
      }
      return [id];
    })
    .filter((p): p is string => !!p);
};

/**
 * Build a lookup config from a resource's columns.
 *
 * @param resolvedDisplayKeys - Pre-resolved display paths for manyToOne columns whose
 *   display key can only be determined by reading a sibling resource file. The api
 *   caller populates this map; the core caller passes `{}`.
 *   Map key: column id; value: the resolved "relation.displayField" path string.
 */
export const buildLookup = (
  columns: JsonColumn[] | undefined,
  search: string[] | undefined,
  lookupConfig?: { labels?: string[]; separator?: string },
  resolvedDisplayKeys: Record<string, string> = {},
): LookupConfig | undefined => {
  if (!columns) return undefined;
  const keyCol = columns.find((c) => c.idField);
  const legacyLookupCols = columns.filter((c) => c.showInLookup);

  const explicitLabels = lookupConfig?.labels;
  if (explicitLabels?.length) {
    // Resolve manyToOne relation column ids to their display paths (e.g. "authorId" → "author.name")
    const resolved = explicitLabels.map((id) => resolvedDisplayKeys[id] ?? id);
    return {
      ...(resolved.length === 1 && { label: resolved[0] }),
      labels: resolved,
      ...(lookupConfig?.separator && { separator: lookupConfig.separator }),
    };
  }

  if (!keyCol && !legacyLookupCols.length && !search?.length) return undefined;

  const labels: string[] = legacyLookupCols.length
    ? legacyLookupCols.map((col) => {
        const relationType = col.relation?.type ?? col.fieldInput?.relationType;
        if (relationType === 'manyToOne') {
          const resolved = resolvedDisplayKeys[col.id];
          if (resolved) return resolved;
          const displayKey =
            col.displayKey ??
            (col.fieldInput?.options as RelationFieldInputOptions | undefined)?.displayKey;
          if (displayKey) {
            const relationName = col.id.replace(/Id$/, '');
            return `${relationName}.${displayKey}`;
          }
        }
        return col.id;
      })
    : (search ?? []);

  return {
    ...(labels.length === 1 && { label: labels[0] }),
    ...(labels.length && { labels }),
    ...(lookupConfig?.separator && { separator: lookupConfig.separator }),
  };
};
