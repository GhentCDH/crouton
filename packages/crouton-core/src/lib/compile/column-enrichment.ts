import type { JsonColumn, JsonIncludeEntry, RelationFieldInputOptions } from '../resource';
import { isRelationColumn } from '../resource/Column';

/** Minimal sub-resource shape needed for action-column enrichment. */
type SubResourceRef = { column: string; childRoute: string; relationType?: string };

export const enrichActionColumns = (
  columns: JsonColumn[] | undefined,
  parentRoute: string,
  subResources: SubResourceRef[],
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!columns) return columns;
  const base = baseUrl ?? '';
  return columns.map((col) => {
    if (!isRelationColumn(col)) return col;
    const sub = subResources.find((s) => s.column === col.id);
    if (!sub) return col;
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        options: {
          ...(col.fieldInput?.options as object | undefined),
          uri: `${base}/${parentRoute}/{id}/${sub.childRoute}`,
          resourceUri: `${base}/${sub.childRoute}`,
          resource:
            sub.relationType === 'manyToOne'
              ? `${base}/${sub.childRoute}/schemas`
              : `${base}/${parentRoute}/${sub.childRoute}/schemas`,
          ...(sub.relationType !== 'manyToOne' && {
            autocompleteResource: `${base}/${sub.childRoute}/schemas`,
          }),
        },
      },
    };
  });
};

// ponytail: inlined from crouton-api sql.helpers; move there if logic diverges
const buildChildSortClause = (
  sort: string,
  sortDir: string | undefined,
): Record<string, unknown> => {
  const parts = sort.split('.');
  const dir = (sortDir ?? 'asc') as 'asc' | 'desc';
  if (parts.length === 1) return { [sort]: dir };
  return parts.reduceRight<Record<string, unknown>>(
    (acc, part, i) => (i === parts.length - 1 ? { [part]: dir } : { [part]: acc }),
    {},
  );
};

export const enrichIncludeWithSort = (
  include: JsonIncludeEntry[] | undefined,
  columns: JsonColumn[],
): JsonIncludeEntry[] | undefined => {
  if (!include?.length) return include;
  return include.map((entry) => {
    const relationName = typeof entry === 'string' ? entry : entry.relation;
    const col = columns.find((c) => {
      if ((c.column ?? c.id) !== relationName) return false;
      if (c.relation?.sort) return true;
      const opts = c.fieldInput?.options as RelationFieldInputOptions | undefined;
      return !!opts?.sort;
    });
    if (!col) return entry;
    const sort = col.relation?.sort ?? (col.fieldInput?.options as RelationFieldInputOptions | undefined)?.sort;
    const sortDir = col.relation?.sortDir ?? (col.fieldInput?.options as RelationFieldInputOptions | undefined)?.sortDir;
    const orderBy = buildChildSortClause(sort!, sortDir ?? 'asc');
    return typeof entry === 'string'
      ? { relation: entry, orderBy }
      : { ...entry, orderBy };
  });
};
