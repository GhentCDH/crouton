import type { JsonColumn, RelationFieldInputOptions } from '../resource';
import type { LookupConfig } from '../schema/definition/lookup.schema';

const isSearchableColumn = (c: JsonColumn): boolean =>
  !c.idField &&
  !c.computed &&
  c.relation === undefined &&
  c.fieldInput?.format !== 'relation' &&
  !c.fieldInput?.relationType &&
  c.fieldInput?.type !== 'date';

export const buildSearch = (
  columns: JsonColumn[] | undefined,
  searchPaths: string[] | undefined,
  findAllEnabled = false,
): string[] | undefined => {
  if (!columns) return undefined;
  if (!searchPaths?.length) {
    if (!findAllEnabled) return undefined;
    const fallback = columns.filter(isSearchableColumn).map((c) => c.id);
    return fallback.length ? fallback : undefined;
  }
  return searchPaths
    .flatMap((id) => {
      const col = columns.find((c) => c.id === id);
      if (!col) return [id];
      if (col.computed) return [];
      if (col.fieldInput?.format === 'relation') {
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
    return {
      ...(explicitLabels.length === 1 && { label: explicitLabels[0] }),
      labels: explicitLabels,
      ...(lookupConfig?.separator && { separator: lookupConfig.separator }),
    };
  }

  if (!keyCol && !legacyLookupCols.length && !search?.length) return undefined;

  const labels: string[] = legacyLookupCols.length
    ? legacyLookupCols.map((col) => {
        if (col.fieldInput?.relationType === 'manyToOne') {
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
