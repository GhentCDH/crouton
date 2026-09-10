import type { ZodObject, ZodRawShape } from 'zod';

import type { CalculatedColumn, JsonAction, JsonColumn, ResourceJson } from '../resource';
import { getResourceExtensions } from '../resource';
import {
  buildViews,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
} from '../view';
import { enrichActionColumns, enrichIncludeWithSort } from './column-enrichment';
import {
  applyRelationFormatDefault,
  buildValueLabelColumns,
  resolveColumnFieldVariants,
} from './column-transforms';
import type { CompiledResource } from './compiled-resource.schema';
import type { CompiledSubResourceConfig } from './compiled-sub-resource.schema';
import type { EnumRegistry } from './enum-registry';
import { injectEnumValues } from './enum-registry';
import type { LookupConfig } from './lookup.schema';
import { enrichRelationTypes } from './relation-type';
import { buildResourceDefinitions } from './schema.helpers';

const pickExtensions = (obj: Record<string, unknown>) =>
  Object.fromEntries(
    [...getResourceExtensions().keys()]
      .filter((k) => obj[k] !== undefined)
      .map((k) => [k, obj[k]]),
  );

const buildLookup = (columns: JsonColumn[] | undefined): LookupConfig | undefined => {
  if (!columns) return undefined;
  const keyCol = columns.find((c) => c.idField);
  const labelCol = columns.find((c) => c.showInLookup) ?? columns.find((c) => c.searchable);
  if (!keyCol && !labelCol) return undefined;
  return { key: keyCol?.id ?? 'id', ...(labelCol && { label: labelCol.id }) };
};

/**
 * Pure compile of a ResourceJson to a CompiledResource — no Node.js fs access.
 * Features that require sibling files (extend columns, resource-ref options,
 * sub-resource views) are skipped; pass those pre-resolved if needed.
 */
export const compileResource = (
  json: ResourceJson,
  schema?: ZodObject<ZodRawShape>,
  baseUrl?: string,
  actions?: JsonAction[],
  tableActions?: JsonAction[],
  enums: EnumRegistry = {},
): CompiledResource => {
  // columns is always JsonColumn[] after ResourceJsonSchema.parse
  const rawColumns = json.columns as JsonColumn[] | undefined;
  const columns: JsonColumn[] = enrichRelationTypes(
    applyRelationFormatDefault(rawColumns) ?? rawColumns ?? [],
    schema,
  );
  injectEnumValues(columns, enums);

  const subResources: CompiledSubResourceConfig[] = [];

  const enrichedColumns = resolveColumnFieldVariants(
    enrichActionColumns(columns, json.route, subResources, baseUrl) ?? columns,
  )!;

  const calculatedColumns: CalculatedColumn[] = json.calculatedColumns ?? [];

  let views = buildViews(schema, enrichedColumns);
  if (views && calculatedColumns.length) {
    views = { ...views, table: injectCalculatedColumns(views.table, calculatedColumns) };
    if (views.view) {
      views = { ...views, view: injectCalculatedColumnsToView(views.view, calculatedColumns) };
    }
  }

  const lookup = buildLookup(enrichedColumns);
  const enrichedInclude = enrichIncludeWithSort(json.include, enrichedColumns);
  const definition = buildResourceDefinitions(schema, json.operations, enrichedColumns);

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
    definition,
    subResources,
    ...(views && { views }),
    ...(lookup && { lookup }),
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(actions?.length && { actions }),
    ...(tableActions?.length && { tableActions }),
    ...(enrichedInclude?.length && { include: enrichedInclude }),
    ...(json.modalSize && { modalSize: json.modalSize }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
    ...pickExtensions(json as Record<string, unknown>),
  } as unknown as CompiledResource;
};
