import type { ZodObject, ZodRawShape } from 'zod';

import { extractFindAllSearch } from '../data-source/Operations.schema';
import type { CalculatedColumn, JsonColumn, RelationFieldInputOptions, ResourceJson } from '../resource';
import { getResourceExtensions } from '../resource';
import {
  buildViews,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
  resolveColumnVisibility,
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

const isSearchableColumn = (c: JsonColumn): boolean =>
  !c.idField &&
  c.fieldInput?.format !== 'relation' &&
  !c.fieldInput?.relationType &&
  c.fieldInput?.type !== 'date';

const buildSearch = (
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
  return searchPaths.map((id) => {
    const col = columns.find((c) => c.id === id);
    if (!col) return id;
    if (col.fieldInput?.format === 'relation') {
      const opts = col.fieldInput.options as RelationFieldInputOptions | undefined;
      if (opts?.displayKey) return `${id}.${opts.displayKey}`;
    }
    return id;
  });
};

const buildLookup = (
  columns: JsonColumn[] | undefined,
  search: string[] | undefined,
): LookupConfig | undefined => {
  if (!columns) return undefined;
  const keyCol = columns.find((c) => c.idField);
  const lookupCols = columns.filter((c) => c.showInLookup);
  if (!keyCol && !lookupCols.length && !search?.length) return undefined;
  const labels = lookupCols.length
    ? lookupCols.map((c) => {
        if (c.fieldInput?.format === 'relation') {
          const opts = c.fieldInput.options as RelationFieldInputOptions | undefined;
          if (opts?.displayKey) return `${c.id}.${opts.displayKey}`;
        }
        return c.id;
      })
    : (search ?? []);
  return {
    key: keyCol?.id ?? 'id',
    ...(labels.length === 1 && { label: labels[0] }),
    ...(labels.length > 0 && { labels }),
  };
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

  const visibilityColumns = resolveColumnVisibility(enrichedColumns, json.layout);
  let views = buildViews(schema, visibilityColumns, json.layout);
  if (views && calculatedColumns.length) {
    views = { ...views, table: injectCalculatedColumns(views.table, calculatedColumns) };
    if (views.view) {
      views = { ...views, view: injectCalculatedColumnsToView(views.view, calculatedColumns) };
    }
  }

  const findAll = json.operations?.findAll;
  const findAllEnabled = findAll !== false && json.kind !== 'custom';
  const searchPaths = buildSearch(enrichedColumns, extractFindAllSearch(findAll), findAllEnabled);
  const lookup = buildLookup(enrichedColumns, searchPaths);
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
    ...(searchPaths?.length && { search: searchPaths }),
    ...(lookup && { lookup }),
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(enrichedInclude?.length && { include: enrichedInclude }),
    ...(json.modalSize && { modalSize: json.modalSize }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
    ...pickExtensions(json as Record<string, unknown>),
  } as unknown as CompiledResource;
};
