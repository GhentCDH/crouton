import type { ZodObject, ZodRawShape } from 'zod';

import type {
  CalculatedColumn,
  JsonColumn,
  ResourceJson,
} from '@ghentcdh/crouton-core';
import {
  buildViews,
  getResourceExtensions,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
} from '@ghentcdh/crouton-core';

import type { ResourceRowAction, ResourceTableAction } from '../action';
import { buildResourceDefinitions } from '../builder/schema.helpers';
import type { CustomRepository } from '../custom-repository';
import { type EnumRegistry, injectEnumValues } from '../enum-registry';
import type { ResourceHooks } from '../hooks';
import {
  enrichActionColumns,
  enrichIncludeWithSort,
  enrichResourceRefColumns,
} from './column-enrichment';
import {
  applyRelationFormatDefault,
  buildValueLabelColumns,
  expandExtendColumns,
  resolveColumnFieldVariants,
} from './column-transforms';
import { enrichRelationTypes } from './relation-type';
import { resolveChildResource } from './resource-resolver';
import { buildSubResources } from './sub-resource.builder';
import { type Resource } from '../resource/ResourceConfig.schema';
import type { LookupConfig } from '../resource/lookup.schema';

const pickExtensions = (obj: Record<string, unknown>) =>
  Object.fromEntries([...getResourceExtensions().keys()].filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));

export const fromJson = (
  json: ResourceJson,
  schema: ZodObject<ZodRawShape> | undefined,
  hooks: ResourceHooks | undefined,
  /** Absolute path to the resource directory (needed to resolve sibling resources). */
  dirPath?: string,
  /** Base URL for generating full URIs in column options (e.g. `http://localhost:3000`). */
  baseUrl?: string,
  /** Resolved action procedures loaded from the `actions/` directory. */
  actions?: ResourceRowAction[],
  /** Resolved table-level action procedures loaded from the `actions/` directory. */
  tableActions?: ResourceTableAction[],
  /** Project enum registry — injected into columns that reference an enum by name. */
  enums: EnumRegistry = {},
  /** Data access for a `kind: "custom"` resource, loaded from `repository.ts`. */
  repository?: CustomRepository,
): Resource => {
  const isCustom = json.kind === 'custom';
  const rawColumns = expandExtendColumns(json.columns, dirPath);
  const columns = enrichRelationTypes(
    applyRelationFormatDefault(rawColumns) ?? rawColumns,
    schema,
  );
  injectEnumValues(columns, enums);

  // Sub-resources are served by nested Prisma queries against the child model,
  // which a custom resource has no equivalent of. Relation columns still render
  // (autocomplete/link) — they just aren't managed through child routes here.
  const subResources = isCustom
    ? []
    : buildSubResources(
        columns,
        json.route,
        json.model ?? '',
        dirPath,
        enums,
        baseUrl,
      );
  // Resolve fieldView/fieldTable variants LAST, after URI/relation enrichment,
  // so the resolved variants inherit the injected relation/resource options.
  const enrichedColumns = resolveColumnFieldVariants(
    enrichResourceRefColumns(
      enrichActionColumns(columns, json.route, subResources, baseUrl),
      dirPath,
      baseUrl,
    ) ?? columns,
  )!;

  const calculatedColumns: CalculatedColumn[] = json.calculatedColumns ?? [];

  let views = buildViews(schema, enrichedColumns);
  if (views && calculatedColumns.length) {
    views = {
      ...views,
      table: injectCalculatedColumns(views.table, calculatedColumns),
    };
    if (views.view) {
      views = {
        ...views,
        view: injectCalculatedColumnsToView(views.view, calculatedColumns),
      };
    }
  }

  const lookup = buildLookup(enrichedColumns, dirPath);
  const enrichedInclude = enrichIncludeWithSort(json.include, enrichedColumns);
  const definition = buildResourceDefinitions(
    schema,
    json.operations,
    enrichedColumns,
  );

  return {
    ...json,
    name: json.name,
    route: json.route,
    model: json.model,
    tag: json.tag,
    sidebar: json.sidebar,
    display: json.display,
    ...(json.idType && { idType: json.idType }),
    ...(lookup?.key && lookup.key !== 'id' && { idField: lookup.key }),
    ...(json.database && { database: json.database }),
    ...(hooks && { hooks }),
    ...(repository && { repository }),
    definition,
    ...(views && { views }),
    ...(lookup && { lookup }),
    ...(subResources.length && { subResources }),
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(actions?.length && { actions }),
    ...(tableActions?.length && { tableActions }),
    ...(enrichedInclude?.length && { include: enrichedInclude }),
    ...(json.modalSize && { modalSize: json.modalSize }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
    ...pickExtensions(json as Record<string, unknown>),
  };
};

const buildLookup = (
  columns: JsonColumn[] | undefined,
  dirPath?: string,
): LookupConfig | undefined => {
  if (!columns) return undefined;

  const keyCol = columns.find((c) => c.idField);
  const searchCols = columns.filter((c) => c.showInLookup || c.searchable);

  if (!keyCol && !searchCols.length) return undefined;

  const labels = searchCols.map((col) => {
    if (col.fieldInput?.relationType === 'manyToOne' && col.fieldInput?.resource && dirPath) {
      const relationName = col.id.replace(/Id$/, '');
      const child = resolveChildResource(col.fieldInput.resource, dirPath);
      const childColumns = child ? expandExtendColumns(child.json.columns, dirPath) : undefined;
      const displayCol = childColumns?.find((c) => !c.idField && !c.hiddenInTable);
      if (displayCol) return `${relationName}.${displayCol.id}`;
    }
    return col.id;
  });

  return {
    key: keyCol?.id ?? 'id',
    ...(labels.length && { label: labels[0], labels }),
  };
};
