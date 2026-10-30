import {
  type EnumRegistry,
  type JsonColumn,
  type JsonIncludeEntry,
  type RelationFieldInputOptions,
  type ViewConfig,
  injectEnumValues,
} from '@ghentcdh/crouton-core';
import {
  applyRelationFormatDefault,
  buildChildSortClause,
  buildLayouts,
  deriveRelationTypeFromColumns,
  fixNestedUiSchemaScopes,
  getPrismaRelationField,
  getRelationResource,
  getRelationType,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
  isRelationColumn,
  nestedColumnSchemaSource,
  resolveCalculatedPlacement,
  toCalculatedColumns,
} from '@ghentcdh/crouton-core';

import { enrichNestedRelationColumns } from './column-enrichment';
import { expandExtendColumns } from './column-transforms';
import { resolveChildResourceDetailed } from './resource-resolver';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';

/**
 * A relation column may point at another service rather than a local child
 * config. Those still render (autocomplete against the remote resource) but are
 * not managed as sub-resources, so they are skipped without complaint.
 */
const REMOTE_RESOURCE = /^https?:\/\//i;

/**q
 * Build `SubResourceConfig` entries for columns with `fieldInput.format === "action"`.
 */
export const buildSubResources = (
  columns: JsonColumn[] | undefined,
  parentRoute: string,
  parentModel: string,
  parentDir?: string,
  enums: EnumRegistry = {},
  baseUrl?: string,
): SubResourceConfig[] => {
  if (!columns || !parentDir) return [];

  return columns
    .filter((c) => isRelationColumn(c) && !!getRelationResource(c))
    .flatMap((c) => {
      const resourcePath = getRelationResource(c)!;
      if (REMOTE_RESOURCE.test(resourcePath)) return [];

      const resolution = resolveChildResourceDetailed(resourcePath, parentDir);

      // A child that cannot be resolved used to fall through as a Prisma-backed
      // sub-resource named after the column, which registers `:id/<column>`
      // routes that fail at request time with `Prisma model "<column>" not
      // found`. Report it at load time and register nothing instead.
      if (!resolution.ok) {
        resourceLoadErrorsRegistry.record({
          name: parentRoute,
          path: resourcePath,
          error:
            resolution.reason === 'missing'
              ? `Relation column "${c.id}" points at "${resourcePath}", but no resource.json was found there (looked in: ${resolution.attempted.join(', ')}). Sub-resource routes for it were not registered.`
              : `Relation column "${c.id}" points at "${resourcePath}", which could not be read: ${resolution.error} Sub-resource routes for it were not registered.`,
          child: { column: c.id, file: resourcePath },
        });
        return [];
      }

      const childJson = resolution.value.json;
      const childDir = resolution.value.dir;

      // `parent` mounts the child's own controller under the parent route. Also
      // declaring it as a sub-resource registers a second, competing handler for
      // the same path off the parent's controller — one of the two silently wins.
      if (childJson.parent) {
        resourceLoadErrorsRegistry.record({
          name: parentRoute,
          path: resourcePath,
          error:
            `Relation column "${c.id}" declares "${childJson.name}" as a sub-resource, but that resource also declares "parent": { "route": "${childJson.parent.route}" }. ` +
            'The two ways of nesting are mutually exclusive — remove the "parent" block to embed it in this resource, or remove this relation column to keep its own nested controller. Sub-resource routes for it were not registered.',
          child: { column: c.id, file: resourcePath },
        });
        return [];
      }

      const childRoute =
        childJson.route ??
        resourcePath
          .replace(/^\.\.?\//, '')
          .replace(/\/resource\.json$/, '')
          .replace(/\.resource$/, '');

      const rawChildColumns = childJson?.columns;
      const expandedChildColumns = rawChildColumns
        ? expandExtendColumns(rawChildColumns, childDir)
        : undefined;
      const childColumns =
        applyRelationFormatDefault(expandedChildColumns) ??
        expandedChildColumns;
      injectEnumValues(childColumns, enums);
      const enrichedChildColumns = enrichNestedRelationColumns(
        childColumns,
        childDir,
        baseUrl,
      );
      const enrichedColumns = enrichedChildColumns ?? [];
      // Auto-derive includes for manyToOne child relations (mirrors main resource logic in read.repository)
      const autoIncludes: string[] = enrichedColumns
        .filter(
          (col) =>
            isRelationColumn(col) &&
            (getRelationType(col) ??
              deriveRelationTypeFromColumns(col, enrichedColumns)) ===
              'manyToOne',
        )
        .map((col) => getPrismaRelationField(col));
      const explicitIncludes: JsonIncludeEntry[] =
        (childJson?.operations?.findAll as Record<string, unknown> | undefined)?.['include'] as JsonIncludeEntry[] | undefined ??
        childJson?.include ??
        [];
      const explicitNames = new Set(
        // JsonIncludeEntry is `any` due to z.lazy — cast for safe property access
        explicitIncludes.map((e) => (typeof e === 'string' ? e : (e as { relation: string }).relation)),
      );
      const mergedIncludes: JsonIncludeEntry[] = [
        ...explicitIncludes,
        ...autoIncludes.filter((name) => !explicitNames.has(name)),
      ];

      const childLookupKey =
        childColumns?.find((col) => col.idField)?.id ?? 'id';
      const childCalculatedColumns = [
        ...(childJson?.calculatedColumns ?? []),
        ...toCalculatedColumns(enrichedChildColumns),
      ];
      const regularChildColumns = (enrichedChildColumns ?? []).filter(
        (c) => !c.computed,
      );
      const rawChildViews = childJson
        ? buildLayouts(childJson?.layout, {
            columns: regularChildColumns,
            source: nestedColumnSchemaSource,
            warn: console.warn,
            resourceName: childJson?.name ?? childJson?.route,
          })
        : undefined;
      const cols = enrichedChildColumns ?? [];
      let childViews: Record<string, ViewConfig> | undefined =
        rawChildViews && Object.keys(rawChildViews).length
          ? (Object.fromEntries(
              Object.entries(rawChildViews).map(([k, v]) => [
                k,
                {
                  ...v,
                  ui: fixNestedUiSchemaScopes(
                    v.ui as Record<string, unknown>,
                    cols,
                  ),
                },
              ]),
            ) as Record<string, ViewConfig>)
          : undefined;
      if (childViews && childCalculatedColumns.length) {
        childViews = {
          ...childViews,
          table: injectCalculatedColumns(
            childViews.table,
            childCalculatedColumns,
            resolveCalculatedPlacement(
              childJson?.layout,
              cols,
              childCalculatedColumns,
              'table',
            ),
          ),
        };
        if (childViews.view) {
          childViews = {
            ...childViews,
            view: injectCalculatedColumnsToView(
              childViews.view,
              childCalculatedColumns,
              resolveCalculatedPlacement(
                childJson?.layout,
                cols,
                childCalculatedColumns,
                'view',
              ),
            ),
          };
        }
      }
      const childOps = childJson?.operations ?? {};
      const childKind = childJson?.kind === 'custom' ? 'custom' : 'prisma';

      return {
        column: c.id,
        relation: getPrismaRelationField(c),
        childRoute,
        childKind,
        ...(childDir && { childDir }),
        // A custom child has no Prisma model. Leave it empty rather than
        // falling back to the column id, which would produce a bogus
        // `prisma[<column>]` lookup at query time.
        // Use the child resource's declared model name so plural column ids
        // (e.g. "books") resolve to the correct Prisma delegate (prisma.book).
        // ponytail: charAt toLowerCase is cheap; Prisma model names are always PascalCase
        childModel:
          childKind === 'custom'
            ? ''
            : (() => {
                const m = childJson?.source?.model;
                return m ? m.charAt(0).toLowerCase() + m.slice(1) : c.id;
              })(),
        ...(childJson?.source?.dbTable
          ? { childTable: childJson.source.dbTable }
          : {}),
        foreignKey:
          c.relation?.foreignKey ??
          c.fieldInput?.foreignKey ??
          `${parentModel.charAt(0).toLowerCase() + parentModel.slice(1)}Id`,
        name: childJson?.name ?? childRoute,
        title:
          childJson?.title ??
          childJson?.openapi?.tag ??
          childJson?.tag ??
          childRoute,
        idField: childLookupKey,
        idType: childJson?.source?.idType ?? 'string',
        ...(childViews && { views: childViews }),
        ...(childJson?.layout && { layout: childJson.layout }),
        operations: {
          findAll: childOps.findAll !== false,
          findOne: childOps.findOne !== false,
          create: childOps.create !== false,
          update: childOps.update !== false,
          patch: childOps.patch !== false,
          delete: childOps.delete !== false,
        },
        ...(mergedIncludes.length && { childInclude: mergedIncludes }),
        ...(childCalculatedColumns.length && {
          calculatedColumns: childCalculatedColumns,
        }),
        ...((c.hiddenInForm === false || c.hiddenInView === false) && {
          includeRelationInParentFindOne: true,
          ...(() => {
            const sort =
              c.relation?.sort ??
              (c.fieldInput?.options as RelationFieldInputOptions | undefined)
                ?.sort;
            const sortDir =
              c.relation?.sortDir ??
              (c.fieldInput?.options as RelationFieldInputOptions | undefined)
                ?.sortDir;
            if (sort)
              return { findOneOrderBy: buildChildSortClause(sort, sortDir) };
            return {};
          })(),
        }),
        ...((childColumns?.length || regularChildColumns.length) && {
          columns: enrichedChildColumns,
        }),
        relationType: (getRelationType(c) ??
          deriveRelationTypeFromColumns(
            c,
            columns,
          )) as SubResourceConfig['relationType'],
        ...(() => {
          const displayKey =
            c.displayKey ??
            (c.fieldInput?.options as RelationFieldInputOptions | undefined)
              ?.displayKey;
          return displayKey ? { displayKey } : {};
        })(),
      } satisfies SubResourceConfig;
    });
};
