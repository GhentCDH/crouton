import type { JsonColumn, JsonIncludeEntry, RelationFieldInputOptions } from '@ghentcdh/crouton-core';
import {
  buildViewsFromColumns,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
} from '@ghentcdh/crouton-core';

import { type EnumRegistry, injectEnumValues } from '../enum-registry';
import { enrichNestedRelationColumns } from './column-enrichment';
import { applyRelationFormatDefault, buildValueLabelColumns, expandExtendColumns } from './column-transforms';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { buildChildSortClause } from '../sql.helpers';
import { deriveRelationTypeFromColumns } from './relation-type';
import { resolveChildResourceDetailed } from './resource-resolver';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';

/**
 * A relation column may point at another service rather than a local child
 * config. Those still render (autocomplete against the remote resource) but are
 * not managed as sub-resources, so they are skipped without complaint.
 */
const REMOTE_RESOURCE = /^https?:\/\//i;

/**
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
    .filter(
      (c) => c.fieldInput?.format === 'relation' && c.fieldInput?.resource,
    )
    .flatMap((c) => {
      const resourcePath = c.fieldInput!.resource!;
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
      // Auto-derive includes for manyToOne child relations (mirrors main resource logic in read.repository)
      const autoIncludes: string[] = (enrichedChildColumns ?? [])
        .filter(
          (col) =>
            col.fieldInput?.format === 'relation' &&
            (col.fieldInput.relationType ??
              deriveRelationTypeFromColumns(col, enrichedChildColumns!)) ===
              'manyToOne',
        )
        .map((col) => col.fieldInput?.relation ?? col.id);
      const explicitIncludes: JsonIncludeEntry[] = childJson?.include ?? [];
      const explicitNames = new Set(
        explicitIncludes.map((e) =>
          typeof e === 'string' ? e : e.relation,
        ),
      );
      const mergedIncludes: JsonIncludeEntry[] = [
        ...explicitIncludes,
        ...autoIncludes.filter((name) => !explicitNames.has(name)),
      ];

      const childLookupKey =
        childColumns?.find((col) => col.idField)?.id ?? 'id';
      const childCalculatedColumns = childJson?.calculatedColumns ?? [];
      let childViews = childJson
        ? buildViewsFromColumns(enrichedChildColumns)
        : undefined;
      if (childViews && childCalculatedColumns.length) {
        childViews = {
          ...childViews,
          table: injectCalculatedColumns(
            childViews.table,
            childCalculatedColumns,
          ),
        };
        if (childViews.view) {
          childViews = {
            ...childViews,
            view: injectCalculatedColumnsToView(
              childViews.view,
              childCalculatedColumns,
            ),
          };
        }
      }
      const childOps = childJson?.operations ?? {};
      const childKind = childJson?.kind === 'custom' ? 'custom' : 'prisma';

      return {
        column: c.id,
        relation: c.fieldInput?.relation ?? c.id,
        childRoute,
        childKind,
        ...(childDir && { childDir }),
        // A custom child has no Prisma model. Leave it empty rather than
        // falling back to the column id, which would produce a bogus
        // `prisma[<column>]` lookup at query time.
        childModel: childKind === 'custom' ? '' : c.id,
        foreignKey: c.fieldInput?.foreignKey ?? `${parentModel}Id`,
        name: childJson?.name ?? childRoute,
        title: childJson?.title ?? childJson?.tag ?? childRoute,
        idField: childLookupKey,
        idType: childJson?.idType ?? 'string',
        ...(c.hiddenInTable && { hiddenInTable: true }),
        ...(childViews && { views: childViews }),
        operations: {
          findAll: childOps.findAll !== false,
          findOne: childOps.findOne !== false,
          create: childOps.create !== false,
          update: childOps.update !== false,
          patch: childOps.patch !== false,
          upsert: childOps.upsert ?? false,
          delete: childOps.delete !== false,
        },
        ...(childJson?.actions?.length && { actions: childJson.actions }),
        ...(childJson?.modalSize && { modalSize: childJson.modalSize }),
        ...(mergedIncludes.length && { include: mergedIncludes }),
        ...(childJson?.calculatedColumns?.length && {
          calculatedColumns: childJson.calculatedColumns,
        }),
        ...((c.hiddenInForm === false || c.hiddenInView === false) && {
          includeInFindOne: true,
          ...(() => {
            const opts = c.fieldInput?.options as RelationFieldInputOptions | undefined;
            if (opts?.sort) return { findOneOrderBy: buildChildSortClause(opts.sort, opts.sortDir) };
            return {};
          })(),
        }),
        ...(buildValueLabelColumns(childColumns).length && {
          valueLabelColumns: buildValueLabelColumns(childColumns),
        }),
        relationType: c.fieldInput?.relationType ?? deriveRelationTypeFromColumns(c, columns!),
      } satisfies SubResourceConfig;
    });
};