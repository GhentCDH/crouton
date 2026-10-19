import type { ZodObject, ZodRawShape } from 'zod';

import { extractFindAllSearch, extractOpInclude } from '../data-source/Operations.schema';
import { buildLayouts, resolveColumnVisibility } from '../layout';
import type { CalculatedColumn, JsonColumn, RelationFieldInputOptions, ResourceJson } from '../resource';
import { getResourceExtensions } from '../resource';
import {
  columnTypeSchemaSource,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
  zodSchemaSource,
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
  c.relation === undefined &&
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
    if (col.relation !== undefined || col.fieldInput?.format === 'relation') {
      const displayKey = col.displayKey ?? (col.fieldInput?.options as RelationFieldInputOptions | undefined)?.displayKey;
      if (displayKey) return `${id}.${displayKey}`;
    }
    return id;
  });
};

const buildLookup = (
  columns: JsonColumn[] | undefined,
  search: string[] | undefined,
  lookupConfig?: { labels?: string[]; separator?: string },
): LookupConfig | undefined => {
  if (!columns) return undefined;
  const keyCol = columns.find((c) => c.idField);
  // Prefer explicit lookup.labels, fall back to showInLookup (deprecated), then search
  const explicitLabels = lookupConfig?.labels;
  const legacyLookupCols = columns.filter((c) => c.showInLookup);
  const rawLabels: string[] = explicitLabels?.length
    ? explicitLabels
    : legacyLookupCols.length
      ? legacyLookupCols.map((c) => {
          if (c.fieldInput?.format === 'relation') {
            const opts = c.fieldInput.options as RelationFieldInputOptions | undefined;
            if (opts?.displayKey) return `${c.id}.${opts.displayKey}`;
          }
          return c.id;
        })
      : (search ?? []);
  if (!keyCol && !rawLabels.length) return undefined;
  return {
    key: keyCol?.id ?? 'id',
    ...(rawLabels.length === 1 && { label: rawLabels[0] }),
    ...(rawLabels.length > 0 && { labels: rawLabels }),
    ...(lookupConfig?.separator && { separator: lookupConfig.separator }),
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

  const calculatedColumns: CalculatedColumn[] = [
    ...((json as any).calculatedColumns ?? []),
    ...((json.columns ?? []) as JsonColumn[])
      .filter((c) => (c as any).computed)
      .map((c): CalculatedColumn => ({
        id: c.id,
        alias: c.id,
        label: c.label ?? c.id,
        sqlExpression: (c as any).computed.sql as string,
        type: (c as any).computed.type ?? 'number',
        hiddenInTable: c.hiddenInTable,
        hiddenInView: c.hiddenInView,
        ...(c.fieldInput && { fieldInput: c.fieldInput }),
      })),
  ];

  const visibilityColumns = resolveColumnVisibility(enrichedColumns, json.layout);
  const layoutCtx = {
    columns: visibilityColumns,
    source: schema ? zodSchemaSource(schema) : columnTypeSchemaSource,
    warn: console.warn,
  };
  const rawViews = buildLayouts(json.layout, layoutCtx);
  let views = Object.keys(rawViews).length ? rawViews : undefined;
  if (views && calculatedColumns.length) {
    views = { ...views, table: injectCalculatedColumns(views.table, calculatedColumns) };
    if (views.view) {
      views = { ...views, view: injectCalculatedColumnsToView(views.view, calculatedColumns) };
    }
  }

  const findAll = json.operations?.findAll;
  const findAllEnabled = findAll !== false && json.kind !== 'custom';
  const searchPaths = buildSearch(enrichedColumns, extractFindAllSearch(findAll), findAllEnabled);
  const lookup = buildLookup(enrichedColumns, searchPaths, (json as any).lookup);
  const findOneOp = json.operations?.findOne;
  const enrichedInclude = enrichIncludeWithSort(extractOpInclude(findAll), enrichedColumns);
  const enrichedFindOneInclude = enrichIncludeWithSort(extractOpInclude(findOneOp), enrichedColumns);
  const definition = buildResourceDefinitions(schema, json.operations, enrichedColumns);

  // Derive display/modalSize from layout.container (Block 2 migration)
  const formContainer = (json.layout?.form as any)?.container;
  const viewContainer = (json.layout?.view as any)?.container;
  const derivedDisplay = {
    mode: (formContainer?.mode ?? viewContainer?.mode ?? 'modal') as 'modal' | 'page',
    customComponent: ((json.layout?.view as any)?.component ?? null) as string | null,
  };
  const derivedModalSize = (formContainer?.size ?? 'sm') as 'xs' | 'sm' | 'lg' | 'xl';

  const src = (json as any).source as { model?: string; table?: string; database?: string; idType?: 'string' | 'number' } | undefined;
  return {
    ...json,
    name: json.name,
    route: json.route,
    tag: json.openapi?.tag ?? json.tag,
    sidebar: json.sidebar,
    display: derivedDisplay,
    modalSize: derivedModalSize,
    ...(src?.model && { model: src.model }),
    ...(src?.table && { table: src.table }),
    ...(src?.database && { database: src.database }),
    ...(src?.idType && { idType: src.idType }),
    ...(lookup?.key && lookup.key !== 'id' && { idField: lookup.key }),
    definition,
    subResources,
    ...(views && { views }),
    ...(searchPaths?.length && { search: searchPaths }),
    ...(lookup && { lookup }),
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(enrichedInclude?.length && { include: enrichedInclude }),
    ...(enrichedFindOneInclude?.length && { findOneInclude: enrichedFindOneInclude }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
    ...pickExtensions(json as Record<string, unknown>),
  } as unknown as CompiledResource;
};
