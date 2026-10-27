import type { ZodObject, ZodRawShape } from 'zod';

import type {
  CalculatedColumn,
  JsonColumn,
  LookupConfig,
  NormalizedData,
  RelationFieldInputOptions,
  ResourceJson,
} from '@ghentcdh/crouton-core';
import {
  allowedIncludes,
  applyRelationFormatDefault,
  buildLayouts,
  buildResourceDefinitions,
  buildValueLabelColumns,
  columnTypeSchemaSource,
  enrichActionColumns,
  enrichIncludeWithSort,
  enrichRelationTypes,
  extractFindAllSearch,
  extractOpInclude,
  getPrismaRelationField,
  getRelationType,
  getResourceExtensions,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
  isRelationColumn,
  resolveColumnFieldVariants,
  resolveColumnVisibility,
  zodSchemaSource,
} from '@ghentcdh/crouton-core';

import type { ResourceRowAction, ResourceTableAction } from '../action';
import type { CustomRepository } from '../custom-repository';
import { type EnumRegistry, injectEnumValues } from '../enum-registry';
import type { ResourceHooks } from '../hooks';
import { enrichResourceRefColumns } from './column-enrichment';
import { expandExtendColumns } from './column-transforms';
import { resolveChildResource } from './resource-resolver';
import { buildSubResources } from './sub-resource.builder';
import { type Resource } from '../resource/ResourceConfig.schema';

const pickExtensions = (obj: Record<string, unknown>) =>
  Object.fromEntries(
    [...getResourceExtensions().keys()]
      .filter((k) => obj[k] !== undefined)
      .map((k) => [k, obj[k]]),
  );

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
  const src = (json as any).source as { model?: string; dbTable?: string; datasource?: string; idType?: 'string' | 'number' } | undefined;
  const rawColumns = expandExtendColumns(json.columns ?? [], dirPath);
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
        src?.model ?? json.model ?? '',
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

  const calculatedColumns: CalculatedColumn[] = [
    ...(json.calculatedColumns ?? []),
    ...enrichedColumns
      .filter((c) => (c as any).computed)
      .map((c): CalculatedColumn => ({
        id: c.id,
        alias: c.id,
        label: c.label ?? c.id,
        sqlExpression: (c as any).computed.sql as string,
        type: (c as any).computed.type ?? 'string',
        ...(c.fieldInput && { fieldInput: c.fieldInput }),
      })),
  ];

  const regularColumns = enrichedColumns.filter((c) => !(c as any).computed);
  const visibilityColumns = resolveColumnVisibility(regularColumns, json.layout);
  const rawViews = buildLayouts(json.layout, {
    columns: visibilityColumns,
    source: schema
      ? (cols) => zodSchemaSource(schema)(cols) ?? columnTypeSchemaSource(cols)
      : columnTypeSchemaSource,
    warn: console.warn,
  });
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
  const findAllEnabled = findAll !== false && !isCustom;
  const searchPaths = buildSearch(enrichedColumns, extractFindAllSearch(findAll), findAllEnabled);
  const lookup = buildLookup(enrichedColumns, dirPath, searchPaths, (json as any).lookup);
  const findOneOp = json.operations?.findOne;
  const enrichedInclude = enrichIncludeWithSort(extractOpInclude(findAll), enrichedColumns);
  const enrichedFindOneInclude = enrichIncludeWithSort(extractOpInclude(findOneOp), enrichedColumns);
  const definition = buildResourceDefinitions(
    schema,
    json.operations,
    enrichedColumns,
  );

  const data: NormalizedData = {
    ...(src?.datasource && { datasource: src.datasource }),
    ...(src?.dbTable && { dbTable: src.dbTable }),
    ...(src?.model && { prismaModel: src.model }),
    idField: lookup?.key ?? 'id',
    idType: src?.idType ?? 'string',
    fields: Object.fromEntries(
      enrichedColumns.map((col) => {
        const isRel = isRelationColumn(col);
        const kind = getRelationType(col);
        const relOpts = col.fieldInput?.options as { displayKey?: string; valueKey?: string } | undefined;
        return [
          col.id,
          {
            id: col.id,
            dbName: col.column ?? col.id,
            type: isRel ? 'relation' : ((col as any).type ?? col.fieldInput?.type ?? 'string'),
            required: false,
            ...(col.unique !== undefined && { unique: !!col.unique }),
            ...(isRel && kind && {
              relation: {
                kind: kind as 'manyToOne' | 'oneToMany' | 'manyToMany',
                target: getPrismaRelationField(col),
                ...((col.displayKey ?? relOpts?.displayKey) ? { displayKey: col.displayKey ?? relOpts?.displayKey } : {}),
                ...(relOpts?.valueKey ? { valueKey: relOpts.valueKey } : {}),
              },
            }),
            ...((col as any).computed?.sql ? { computed: { sql: (col as any).computed.sql as string } } : {}),
          },
        ];
      }),
    ),
    search: searchPaths ?? [],
    ...(lookup && { lookup }),
    include: {
      findAll: (enrichedInclude ?? []).map((e) => (typeof e === 'string' ? e : (e as any).relation)),
      findOne: (enrichedFindOneInclude ?? []).map((e) => (typeof e === 'string' ? e : (e as any).relation)),
    },
    allowedIncludes: allowedIncludes(enrichedColumns),
    valueLabels: buildValueLabelColumns(enrichedColumns),
    computed: enrichedColumns
      .filter((c) => (c as any).computed?.sql)
      .map((c) => ({ id: c.id, sql: (c as any).computed.sql as string, type: ((c as any).computed.type as string | undefined) ?? 'string' })),
    subResources: subResources.map((s) => ({
      childRoute: s.childRoute,
      target: s.relation ?? s.childRoute,
      relationType: (s.relationType ?? 'oneToMany') as 'oneToMany' | 'manyToOne' | 'manyToMany',
      column: s.column,
      ...(s.displayKey && { displayKey: s.displayKey }),
    })),
    actions: [],
  };

  const formContainer = (json.layout?.form as any)?.container;
  const viewContainer = (json.layout?.view as any)?.container;
  const derivedDisplay = {
    mode: (formContainer?.mode ?? viewContainer?.mode ?? 'modal') as 'modal' | 'page',
    customComponent: ((json.layout?.view as any)?.component ?? null) as string | null,
  };
  const derivedModalSize = (formContainer?.size ?? 'sm') as 'xs' | 'sm' | 'lg' | 'xl';
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
    ...(lookup?.key && lookup.key !== 'id' && { idField: lookup.key }),
    ...(hooks && { hooks }),
    ...(repository && { repository }),
    definition,
    ...(views && { views }),
    ...(searchPaths?.length && { search: searchPaths }),
    ...(lookup && { lookup }),
    ...(subResources.length && { subResources }),
    ...(calculatedColumns.length && { calculatedColumns }),
    ...(actions?.length && { actions }),
    ...(tableActions?.length && { tableActions }),
    ...(enrichedInclude?.length && { include: enrichedInclude }),
    ...(enrichedFindOneInclude?.length && { findOneInclude: enrichedFindOneInclude }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
    data,
    ...pickExtensions(json as Record<string, unknown>),
  } as unknown as Resource;
};

const isSearchableColumn = (c: JsonColumn): boolean =>
  !c.idField &&
  !(c as any).computed &&
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
  return searchPaths
    .flatMap((id) => {
      const col = columns.find((c) => c.id === id);
      if (!col) return [id];
      if ((col as any).computed) return [];
      if (col.fieldInput?.format === 'relation') {
        const opts = col.fieldInput.options as RelationFieldInputOptions | undefined;
        if (opts?.displayKey) return [`${id}.${opts.displayKey}`];
      }
      if (col.fieldInput?.relationType === 'manyToOne') {
        const displayKey =
          (col.fieldInput.options as any)?.displayKey ?? (col as any).displayKey;
        if (displayKey) return [`${id}.${displayKey}`];
      }
      return [id];
    })
    .filter((p): p is string => !!p);
};

const buildLookup = (
  columns: JsonColumn[] | undefined,
  dirPath?: string,
  search?: string[],
  lookupConfig?: { labels?: string[]; separator?: string },
): LookupConfig | undefined => {
  if (!columns) return undefined;

  const keyCol = columns.find((c) => c.idField);
  const legacyLookupCols = columns.filter((c) => c.showInLookup);

  // Prefer explicit lookup.labels, fall back to showInLookup (deprecated), then search
  if (lookupConfig?.labels?.length) {
    return {
      key: keyCol?.id ?? 'id',
      ...(lookupConfig.labels.length === 1 && { label: lookupConfig.labels[0] }),
      labels: lookupConfig.labels,
      ...(lookupConfig.separator && { separator: lookupConfig.separator }),
    };
  }

  if (!keyCol && !legacyLookupCols.length && !search?.length) return undefined;

  const labels = legacyLookupCols.length
    ? legacyLookupCols.map((col) => {
        if (col.fieldInput?.relationType === 'manyToOne') {
          const relationName = col.id.replace(/Id$/, '');
          if (col.fieldInput?.resource && dirPath) {
            const child = resolveChildResource(col.fieldInput.resource, dirPath);
            const childColumns = child
              ? expandExtendColumns(child.json.columns ?? [], dirPath)
              : undefined;
            const displayCol = childColumns?.find(
              (c) => !c.idField && !c.hiddenInTable,
            );
            if (displayCol) return `${relationName}.${displayCol.id}`;
          }
          const displayKey =
            col.displayKey ?? (col.fieldInput?.options as any)?.displayKey;
          if (displayKey) return `${relationName}.${displayKey}`;
        }
        return col.id;
      })
    : (search ?? []);

  return {
    key: keyCol?.id ?? 'id',
    ...(labels.length && { label: labels[0], labels }),
  };
};
