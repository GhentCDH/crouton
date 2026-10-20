import type { JsonColumn } from '@ghentcdh/crouton-core';
import { deriveRelationTypeFromColumns, isRelationColumn  } from '@ghentcdh/crouton-core';

import { resolveChildResource } from './resource-resolver';

/**
 * Return a new columns array with `resourceUri`/`schemasUri` injected into
 * `fieldInput.options` for NON-relation columns that reference a resource file
 * (e.g. a select whose values come from another resource). Relation columns
 * are handled by `enrichActionColumns` (from @ghentcdh/crouton-core).
 */
export const enrichResourceRefColumns = (
  columns: JsonColumn[] | undefined,
  parentDir?: string,
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!columns || !parentDir) return columns;
  const base = baseUrl ?? '';
  return columns.map((col) => {
    if (!col.fieldInput?.resource || isRelationColumn(col))
      return col;
    const childResolved = resolveChildResource(
      col.fieldInput.resource,
      parentDir,
    );
    const childRoute =
      childResolved?.json?.route ??
      col.fieldInput.resource
        .replace(/^\.\.?\//, '')
        .replace(/\/resource\.json$/, '')
        .replace(/\.resource$/, '');
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        options: {
          ...(col.fieldInput.options as object | undefined),
          resourceUri: `${base}/${childRoute}`,
          schemasUri: `${base}/${childRoute}/schemas`,
        },
      },
    };
  });
};

/**
 * Inject resource references (`uri`, `resourceUri`, `resource` = schemas URL)
 * into a sub-resource's own relation columns. `enrichActionColumns` only runs
 * for top-level resource columns, so a relation nested inside a sub-resource
 * would otherwise have no way to fetch the related form/list.
 */
export const enrichNestedRelationColumns = (
  cols: JsonColumn[] | undefined,
  dir: string | undefined,
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!cols || !dir) return cols;
  const base = baseUrl ?? '';
  return cols.map((col) => {
    const relResource = col.relation?.resource ?? col.fieldInput?.resource;
    if (!isRelationColumn(col) || !relResource) return col;
    const resolved = resolveChildResource(relResource, dir);
    const targetRoute =
      resolved?.json?.route ??
      relResource
        .replace(/^\.\//, '')
        .replace(/\/resource\.json$/, '')
        .replace(/\.resource$/, '');
    const relationType =
      (col.relation?.type ?? col.fieldInput?.relationType) ?? deriveRelationTypeFromColumns(col, cols);
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        relationType,
        options: {
          ...(col.fieldInput?.options as object | undefined),
          uri: `${base}/${targetRoute}`,
          resourceUri: `${base}/${targetRoute}`,
          resource: `${base}/${targetRoute}/schemas`,
        },
      },
    };
  });
};
