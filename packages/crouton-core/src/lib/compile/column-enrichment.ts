import { buildChildSortClause } from '../request/filter';
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
    const userOpts = col.fieldInput?.options as Record<string, unknown> | undefined;
    const userAutocomplete = userOpts?.autocompleteResource as string | undefined;
    const resolvedAutocomplete = userAutocomplete
      ? userAutocomplete.startsWith('http')
        ? userAutocomplete
        : `${base}/${userAutocomplete.replace(/^\//, '')}`
      : `${base}/${sub.childRoute}/schemas`;
    // manyToOne targets a top-level resource; other sub-resources are only mounted under the parent.
    const resourceUri =
      sub.relationType === 'manyToOne'
        ? `${base}/${sub.childRoute}`
        : `${base}/${parentRoute}/${sub.childRoute}`;
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        options: {
          ...userOpts,
          uri: `${base}/${parentRoute}/{id}/${sub.childRoute}`,
          resourceUri,
          resource: `${resourceUri}/schemas`,
          ...(sub.relationType !== 'manyToOne' && {
            autocompleteResource: resolvedAutocomplete,
          }),
        },
      },
    };
  });
};


export const enrichIncludeWithSort = (
  include: JsonIncludeEntry[] | undefined,
  columns: JsonColumn[],
): JsonIncludeEntry[] | undefined => {
  if (!include?.length) return include;
  return include.map((entry) => {
    // For dot-path strings ("a.b"), only the top-level segment ("a") maps to a column.
    const rawName = typeof entry === 'string' ? entry : entry.relation;
    const relationName = rawName.includes('.') ? rawName.slice(0, rawName.indexOf('.')) : rawName;
    const col = columns.find((c) => {
      if ((c.column ?? c.id) !== relationName) return false;
      if (c.relation?.sort) return true;
      const opts = c.fieldInput?.options as RelationFieldInputOptions | undefined;
      return !!opts?.sort;
    });
    if (!col) return entry;
    const sort = col.relation?.sort ?? (col.fieldInput?.options as RelationFieldInputOptions | undefined)?.sort;
    const sortDir = col.relation?.sortDir ?? (col.fieldInput?.options as RelationFieldInputOptions | undefined)?.sortDir;
    if (!sort) return entry;
    const orderBy = buildChildSortClause(sort, sortDir ?? 'asc');
    if (typeof entry !== 'string') return { ...entry, orderBy };
    if (rawName === relationName) return { relation: entry, orderBy };
    // Dot-path string with sort on top relation: split into object form so the nested path
    // and the orderBy are both preserved when buildIncludeClause processes the entry.
    return { relation: relationName, include: [rawName.slice(relationName.length + 1)], orderBy };
  });
};
