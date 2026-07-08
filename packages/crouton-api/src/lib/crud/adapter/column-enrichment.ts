import type { JsonColumn, JsonIncludeEntry, RelationFieldInputOptions } from '@ghentcdh/crouton-core';

import type { SubResourceConfig } from '../resource/SubResource.schema';
import { buildChildSortClause } from '../sql.helpers';
import { deriveRelationTypeFromColumns } from './relation-type';
import { resolveChildResource } from './resource-resolver';

/**
 * Return a new columns array with `uri`, `resourceUri`, and `resource` (schemas URL)
 * injected into `fieldInput.options` for relation columns.
 */
export const enrichActionColumns = (
  columns: JsonColumn[] | undefined,
  parentRoute: string,
  subResources: SubResourceConfig[],
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!columns) return columns;
  const base = baseUrl ?? '';
  return columns.map((col) => {
    if (col.fieldInput?.format !== 'relation') return col;
    const sub = subResources.find((s) => s.column === col.id);
    if (!sub) return col;
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        options: {
          ...(col.fieldInput.options as object | undefined),
          uri: `${base}/${parentRoute}/{id}/${sub.childRoute}`,
          resourceUri: `${base}/${sub.childRoute}`,
          ...(sub.views && {
            resource: `${base}/${parentRoute}/${sub.childRoute}/schemas`,
          }),
        },
      },
    };
  });
};

/**
 * Return a new columns array with `resourceUri`/`schemasUri` injected into
 * `fieldInput.options` for NON-relation columns that reference a resource file
 * (e.g. a select whose values come from another resource). Relation columns
 * are handled by `enrichActionColumns`.
 */
export const enrichResourceRefColumns = (
  columns: JsonColumn[] | undefined,
  parentDir?: string,
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!columns || !parentDir) return columns;
  const base = baseUrl ?? '';
  return columns.map((col) => {
    if (!col.fieldInput?.resource || col.fieldInput.format === 'relation')
      return col;
    const childResolved = resolveChildResource(
      col.fieldInput.resource,
      parentDir,
    );
    const childRoute =
      childResolved?.json?.route ??
      col.fieldInput.resource.replace(/^\.\//, '').replace(/\.resource$/, '');
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
 * (e.g. `text → text_author → author`) would otherwise have no way to fetch the
 * related form/list. These point at the related resource's standalone routes.
 */
export const enrichNestedRelationColumns = (
  cols: JsonColumn[] | undefined,
  dir: string | undefined,
  baseUrl?: string,
): JsonColumn[] | undefined => {
  if (!cols || !dir) return cols;
  const base = baseUrl ?? '';
  return cols.map((col) => {
    if (col.fieldInput?.format !== 'relation' || !col.fieldInput.resource)
      return col;
    const resolved = resolveChildResource(col.fieldInput.resource, dir);
    const targetRoute =
      resolved?.json?.route ??
      col.fieldInput.resource
        .replace(/^\.\//, '')
        .replace(/\/resource\.json$/, '')
        .replace(/\.resource$/, '');
    const relationType =
      col.fieldInput.relationType ?? deriveRelationTypeFromColumns(col, cols);
    return {
      ...col,
      fieldInput: {
        ...col.fieldInput,
        relationType,
        options: {
          ...(col.fieldInput.options as object | undefined),
          uri: `${base}/${targetRoute}`,
          resourceUri: `${base}/${targetRoute}`,
          resource: `${base}/${targetRoute}/schemas`,
        },
      },
    };
  });
};

/**
 * Scan relation columns for a `sort` option and inject a Prisma-format `orderBy`
 * into the corresponding `include` entry so included records are returned sorted.
 *
 * Example: a column `{ id: "sections", fieldInput: { options: { sort: "title" } } }`
 * turns `include: ["sections"]` into `include: [{ relation: "sections", orderBy: { title: "asc" } }]`.
 */
export const enrichIncludeWithSort = (
  include: JsonIncludeEntry[] | undefined,
  columns: JsonColumn[],
): JsonIncludeEntry[] | undefined => {
  if (!include?.length) return include;
  return include.map((entry) => {
    const relationName = typeof entry === 'string' ? entry : entry.relation;
    const col = columns.find((c) => {
      const opts = c.fieldInput?.options as
        RelationFieldInputOptions | undefined;
      return (c.column ?? c.id) === relationName && opts?.sort;
    });
    if (!col) return entry;
    const opts = col.fieldInput!.options as RelationFieldInputOptions;
    const orderBy = buildChildSortClause(opts.sort!, opts.sortDir ?? 'asc');
    return typeof entry === 'string'
      ? { relation: entry, orderBy }
      : { ...entry, orderBy };
  });
};