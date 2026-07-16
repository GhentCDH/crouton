import type { JsonColumn } from '@ghentcdh/crouton-core';

import {
  buildViewsFromColumns,
  injectCalculatedColumns,
  injectCalculatedColumnsToView
} from '../builder';
import { type EnumRegistry, injectEnumValues } from '../enum-registry';
import { enrichNestedRelationColumns } from './column-enrichment';
import { applyRelationFormatDefault, buildValueLabelColumns, expandExtendColumns } from './column-transforms';
import { resolveChildResource } from './resource-resolver';
import type { SubResourceConfig } from '../resource/SubResource.schema';

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
    .map((c) => {
      const childResolved = resolveChildResource(
        c.fieldInput!.resource!,
        parentDir,
      );
      const childJson = childResolved?.json;
      const childDir = childResolved?.dir;
      const childRoute =
        childJson?.route ??
        c.fieldInput!.resource!.replace(/^\.\//, '').replace(/\.resource$/, '');

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

      return {
        column: c.id,
        relation: c.id,
        childRoute,
        childModel: c.id,
        foreignKey: `${parentModel}_id`,
        name: childJson?.name ?? childRoute,
        title: childJson?.title ?? childJson?.tag ?? childRoute,
        idField: childLookupKey,
        idType: childJson?.idType ?? 'string',
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
        ...(childJson?.include?.length && { include: childJson.include }),
        ...(childJson?.calculatedColumns?.length && {
          calculatedColumns: childJson.calculatedColumns,
        }),
        ...((c.hiddenInForm === false || c.hiddenInView === false) && {
          includeInFindOne: true,
        }),
        ...(buildValueLabelColumns(childColumns).length && {
          valueLabelColumns: buildValueLabelColumns(childColumns),
        }),
      } satisfies SubResourceConfig;
    });
};