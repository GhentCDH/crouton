import type { ZodObject, ZodRawShape } from 'zod';

import {
  extractFindAllSearch,
  extractOpInclude,
} from '../data-source/Operations.schema';
import { buildLayouts } from '../layout';
import type { CalculatedColumn, JsonColumn, ResourceJson } from '../resource';
import {
  columnTypeSchemaSource,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
  resolveColumnVisibility,
  zodSchemaSource,
} from '../view';
import {
  enrichActionColumns,
  enrichIncludeWithSort,
} from './column-enrichment';
import {
  applyRelationFormatDefault,
  buildValueLabelColumns,
  resolveColumnFieldVariants,
} from './column-transforms';
import type { CompiledResource } from './compiled-resource.schema';
import type { CompiledSubResourceConfig } from './compiled-sub-resource.schema';
import type { EnumRegistry } from './enum-registry';
import { injectEnumValues } from './enum-registry';
import { enrichRelationTypes } from './relation-type';
import { buildResourceDefinitions } from './schema.helpers';
import { buildLookup, buildSearch } from './search-lookup';
import { pickExtensions } from '../resource/extensions';

export type CompileResolvers = {
  /** Expand `extends` columns from a sibling resource. Default: identity. */
  expandColumns?: (columns: JsonColumn[]) => JsonColumn[];
  /** Add options that need another resource (resource-ref URIs, nested relation columns). Default: identity. */
  enrichResourceRefs?: (columns: JsonColumn[]) => JsonColumn[];
  /** Build sub-resources from relation columns. Default: returns `[]`. */
  buildSubResources?: (
    columns: JsonColumn[],
    ctx: { route: string; model: string },
  ) => CompiledSubResourceConfig[];
  /** Pre-resolve lookup display keys for manyToOne showInLookup columns. Default: `{}`. */
  resolveLookupDisplayKeys?: (columns: JsonColumn[]) => Record<string, string>;
};

export type CompileOptions = {
  baseUrl?: string;
  enums?: EnumRegistry;
  resolvers?: CompileResolvers;
};

/**
 * Pure compile of a ResourceJson to a CompiledResource. Steps that need
 * the filesystem are injected via `options.resolvers`; core never reads files.
 */
export const compileResource = (
  json: ResourceJson,
  schema?: ZodObject<ZodRawShape>,
  options: CompileOptions = {},
): CompiledResource => {
  const { baseUrl, enums = {}, resolvers = {} } = options;
  const src = json.source;

  const rawColumns: JsonColumn[] = resolvers.expandColumns
    ? resolvers.expandColumns(json.columns ?? [])
    : (json.columns ?? []);

  const columns: JsonColumn[] = enrichRelationTypes(
    applyRelationFormatDefault(rawColumns) ?? rawColumns,
    schema,
  );
  injectEnumValues(columns, enums);

  const subResources: CompiledSubResourceConfig[] = resolvers.buildSubResources
    ? resolvers.buildSubResources(columns, {
        route: json.route,
        model: src?.model ?? json.model ?? '',
      })
    : [];

  const actionEnriched =
    enrichActionColumns(columns, json.route, subResources, baseUrl) ?? columns;
  const enrichedColumns = resolveColumnFieldVariants(
    resolvers.enrichResourceRefs
      ? resolvers.enrichResourceRefs(actionEnriched)
      : actionEnriched,
  )!;

  const calculatedColumns: CalculatedColumn[] = [
    ...(json.calculatedColumns ?? []),
    ...enrichedColumns
      .filter((c) => c.computed)
      .map((c): CalculatedColumn => ({
        id: c.id,
        alias: c.id,
        label: c.label ?? c.id,
        sqlExpression: c.computed!.sql,
        type: c.computed!.type ?? 'string',
        hiddenInTable: c.hiddenInTable,
        hiddenInView: c.hiddenInView,
        ...(c.fieldInput && { fieldInput: c.fieldInput }),
      })),
  ];

  const regularColumns = enrichedColumns.filter((c) => !c.computed);
  const visibilityColumns = resolveColumnVisibility(
    regularColumns,
    json.layout,
  );
  const layoutCtx = {
    columns: visibilityColumns,
    source: schema ? zodSchemaSource(schema) : columnTypeSchemaSource,
    warn: console.warn,
    resourceName: json.name ?? json.route,
  };
  const rawViews = buildLayouts(json.layout, layoutCtx);
  let views = Object.keys(rawViews).length ? rawViews : undefined;
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

  const findAll = json.operations?.findAll;
  const findAllEnabled = findAll !== false && json.kind !== 'custom';
  const searchPaths = buildSearch(
    enrichedColumns,
    extractFindAllSearch(findAll),
    findAllEnabled,
  );
  const resolvedDisplayKeys = resolvers.resolveLookupDisplayKeys
    ? resolvers.resolveLookupDisplayKeys(enrichedColumns)
    : {};
  const lookup = buildLookup(
    enrichedColumns,
    searchPaths,
    json.lookup,
    resolvedDisplayKeys,
  );
  const findOneOp = json.operations?.findOne;
  const enrichedInclude = enrichIncludeWithSort(
    extractOpInclude(findAll),
    enrichedColumns,
  );
  const enrichedFindOneInclude = enrichIncludeWithSort(
    extractOpInclude(findOneOp),
    enrichedColumns,
  );
  const definition = buildResourceDefinitions(
    schema,
    json.operations,
    enrichedColumns,
  );

  const formContainer = json.layout?.form?.container;
  const viewContainer = json.layout?.view?.container;
  const derivedDisplay = {
    mode: (formContainer?.mode ?? viewContainer?.mode ?? 'modal') as
      'modal' | 'page',
    customComponent: (json.layout?.view?.component ?? null) as string | null,
  };
  const derivedModalSize = (formContainer?.size ?? 'sm') as
    'xs' | 'sm' | 'lg' | 'xl';

  return {
    ...json,
    name: json.name,
    route: json.route,
    tag: json.openapi?.tag ?? json.tag,
    sidebar: json.sidebar,
    display: derivedDisplay,
    modalSize: derivedModalSize,
    ...(src?.model && { model: src.model }),
    ...(src?.dbTable && { table: src.dbTable }),
    ...(src?.datasource && { database: src.datasource }),
    ...(src?.idType && { idType: src.idType }),
    idField: lookup?.key ?? 'id',
    definition,
    subResources,
    views: views ?? {},
    ...(searchPaths?.length && { search: searchPaths }),
    lookup,
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(enrichedInclude?.length && { include: enrichedInclude }),
    ...(enrichedFindOneInclude?.length && {
      findOneInclude: enrichedFindOneInclude,
    }),
    valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    ...pickExtensions(json),
  };
};
