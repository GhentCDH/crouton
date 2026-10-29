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
  resolveColumnFieldVariants,
} from './column-transforms';
import type { CompiledResource } from './compiled-resource.schema';
import type { CompiledSubResourceConfig } from './compiled-sub-resource.schema';
import type { EnumRegistry } from './enum-registry';
import { injectEnumValues } from './enum-registry';
import { enrichRelationTypes } from './relation-type';
import { buildLookup, buildSearch } from './search-lookup';
import { pickExtensions } from '../resource/extensions';
import { buildResourceDefinitions } from '../schema/definition/schema.helpers';

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
  // The primary key is a first-class compiled field; `lookup` no longer carries it.
  const idField = enrichedColumns.find((c) => c.idField)?.id ?? 'id';
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

  // Input-only: the compiled resource exposes `definition`, not the raw
  // operation toggles. Drop it so it does not leak from the input spread.
  const {
    operations: _operations,
    openapi,
    draft: _draft,
    $schema: _jsonSchema,
    source: _source,
    model: rootModel,
    table: rootTable,
    database: rootDatabase,
    idType: rootIdType,
    include: _inputInclude,
    calculatedColumns: _inputCalculated,
    ...jsonRest
  } = json;

  // `source.*` wins; the legacy root aliases remain a fallback for resources
  // built programmatically instead of through the migration.
  const flattenedModel = src?.model ?? rootModel;
  const flattenedTable = src?.dbTable ?? rootTable;
  const flattenedDatabase = src?.datasource ?? rootDatabase;
  const flattenedIdType = src?.idType ?? rootIdType;

  return {
    ...jsonRest,
    name: json.name,
    route: json.route,
    tag: openapi?.tag ?? json.tag,
    sidebar: json.sidebar,
    ...(flattenedModel && { model: flattenedModel }),
    ...(flattenedTable && { table: flattenedTable }),
    ...(flattenedDatabase && { database: flattenedDatabase }),
    idType: flattenedIdType ?? 'string',
    idField,
    definition,
    subResources,
    // Overwrite the raw input `columns` (from `jsonRest`) with the enriched
    // array: enum injection (`options.values`) and relation formatting only
    // survive compilation when the resolver built a new array. Runtime
    // consumers (crouton-api) derive value-label decoration from these columns.
    columns: enrichedColumns,
    ...(views && { views }),
    ...(searchPaths?.length && { search: searchPaths }),
    lookup,
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(enrichedInclude?.length && { findAllInclude: enrichedInclude }),
    ...(enrichedFindOneInclude?.length && {
      findOneInclude: enrichedFindOneInclude,
    }),
    ...pickExtensions(json),
  };
};
