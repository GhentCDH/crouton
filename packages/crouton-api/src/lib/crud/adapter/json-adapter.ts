import type { ZodObject, ZodRawShape } from 'zod';

import type {
  CalculatedColumn,
  JsonColumn,
  ResourceJson,
} from '@ghentcdh/crouton-core';
import {
  applyRelationFormatDefault,
  buildLayouts,
  buildLookup,
  buildResourceDefinitions,
  buildSearch,
  buildValueLabelColumns,
  columnTypeSchemaSource,
  enrichActionColumns,
  enrichIncludeWithSort,
  enrichRelationTypes,
  extractFindAllSearch,
  extractOpInclude,
  injectCalculatedColumns,
  injectCalculatedColumnsToView,
  pickExtensions,
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
  const src = (json as any).source as
    | {
        model?: string;
        dbTable?: string;
        datasource?: string;
        idType?: 'string' | 'number';
      }
    | undefined;
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
        hiddenInTable: c.hiddenInTable,
        hiddenInView: c.hiddenInView,
        ...(c.fieldInput && { fieldInput: c.fieldInput }),
      })),
  ];

  const regularColumns = enrichedColumns.filter((c) => !(c as any).computed);
  const visibilityColumns = resolveColumnVisibility(
    regularColumns,
    json.layout,
  );
  const rawViews = buildLayouts(json.layout, {
    columns: visibilityColumns,
    source: schema
      ? (cols) => zodSchemaSource(schema)(cols) ?? columnTypeSchemaSource(cols)
      : columnTypeSchemaSource,
    warn: console.warn,
    resourceName: json.name ?? json.route,
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
  const searchPaths = buildSearch(
    enrichedColumns,
    extractFindAllSearch(findAll),
    findAllEnabled,
  );
  const resolvedDisplayKeys = resolveLookupDisplayKeys(
    enrichedColumns,
    dirPath,
  );
  const lookup = buildLookup(
    enrichedColumns,
    searchPaths,
    (json as any).lookup,
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

  const formContainer = (json.layout?.form as any)?.container;
  const viewContainer = (json.layout?.view as any)?.container;
  const derivedDisplay = {
    mode: (formContainer?.mode ?? viewContainer?.mode ?? 'modal') as
      'modal' | 'page',
    customComponent: ((json.layout?.view as any)?.component ?? null) as
      string | null,
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
    ...(enrichedFindOneInclude?.length && {
      findOneInclude: enrichedFindOneInclude,
    }),
    ...(buildValueLabelColumns(enrichedColumns).length && {
      valueLabelColumns: buildValueLabelColumns(enrichedColumns),
    }),
    ...pickExtensions(json as Record<string, unknown>),
  } as unknown as Resource;
};

const resolveLookupDisplayKeys = (
  columns: JsonColumn[],
  dirPath: string | undefined,
): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!dirPath) return result;
  for (const col of columns) {
    if (!col.showInLookup || col.fieldInput?.relationType !== 'manyToOne')
      continue;
    if (!col.fieldInput?.resource) continue;
    const child = resolveChildResource(col.fieldInput.resource, dirPath);
    const childColumns = child
      ? expandExtendColumns(child.json.columns ?? [], dirPath)
      : undefined;
    const displayCol = childColumns?.find(
      (c) => !c.idField && !c.hiddenInTable,
    );
    if (displayCol)
      result[col.id] = `${col.id.replace(/Id$/, '')}.${displayCol.id}`;
  }
  return result;
};
