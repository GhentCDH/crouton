import { allowedIncludes } from '../request/include';
import type { RelationFieldInputOptions } from '../resource';
import { ResourceJsonSchema } from '../resource';
import type { JsonColumn } from '../resource/Column';
import {
  getPrismaRelationField,
  getRelationType,
  isRelationColumn,
} from '../resource/Column';
import { resolveTableNode } from '../view';
import {
  enrichActionColumns,
  enrichIncludeWithSort,
} from './column-enrichment';
import {
  applyRelationFormatDefault,
  buildValueLabelColumns,
  resolveColumnFieldVariants,
} from './column-transforms';
import { compileResource } from './compile-resource';
import {
  externalRouteFor,
  isOperationEnabled,
  isOperationExternal,
  resolveDefinition,
} from './crud-config';
import { injectEnumValues } from './enum-registry';
import type { DataField, NormalizeResult, NormalizedData, NormalizedResource, ResourceInput } from './model';
import {
  NormalizeResultSchema,
  NormalizedResourceSchema,
} from './model/normalized-resource.schema';
import { resolveActions, resolveTableActions } from './payload-builders';
import { enrichRelationTypes } from './relation-type';

// ---------------------------------------------------------------------------
// Column → DataField
// ---------------------------------------------------------------------------

const FIELD_TYPE_MAP: Record<string, string> = {
  integer: 'number',
  float: 'number',
  boolean: 'boolean',
  date: 'string',
  datetime: 'string',
  uuid: 'string',
};

const deriveFieldType = (col: JsonColumn): string => {
  const t = (col as any).type ?? col.fieldInput?.type;
  if (typeof t === 'string') return FIELD_TYPE_MAP[t] ?? t;
  return 'string';
};

const deriveRelationKind = (
  col: JsonColumn,
): 'manyToOne' | 'oneToMany' | 'manyToMany' | undefined => {
  const rt = getRelationType(col);
  if (!rt) return undefined;
  if (rt === 'manyToOne') return 'manyToOne';
  if (rt === 'manyToMany') return 'manyToMany';
  return 'oneToMany';
};

const colToDataField = (col: JsonColumn, required: boolean): DataField => {
  const isRelation = isRelationColumn(col);
  const kind = isRelation ? deriveRelationKind(col) : undefined;
  const relOpts = col.fieldInput?.options as RelationFieldInputOptions | undefined;

  return {
    id: col.id,
    dbName: col.column ?? col.id,
    type: isRelation ? 'relation' : deriveFieldType(col),
    required,
    ...(col.unique !== undefined && { unique: !!col.unique }),
    ...(isRelation && kind && {
      relation: {
        kind,
        target: getPrismaRelationField(col),
        ...((col.displayKey ?? relOpts?.displayKey) ? { displayKey: col.displayKey ?? relOpts?.displayKey } : {}),
        ...(relOpts?.valueKey ? { valueKey: relOpts.valueKey } : {}),
      },
    }),
    ...((col as any).computed?.sql && {
      computed: { sql: (col as any).computed.sql as string },
    }),
  };
};

// ---------------------------------------------------------------------------
// Operation helpers
// ---------------------------------------------------------------------------

const OP_SUFFIX: Record<string, string> = {
  findAll: '',
  findOne: '/{id}',
  create: '',
  update: '/{id}',
  patch: '/{id}',
  delete: '/{id}',
};

const OP_METHOD: Record<string, string> = {
  findAll: 'GET',
  findOne: 'GET',
  create: 'POST',
  update: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
};

const RESOURCE_OPS = [
  'findAll',
  'findOne',
  'create',
  'update',
  'patch',
  'delete',
] as const;

// ---------------------------------------------------------------------------
// normalizeResource
// ---------------------------------------------------------------------------

/**
 * Pure, browser-safe normalization from a ResourceInput to a NormalizedResource.
 *
 * Stage 2.0: parse unknown → ResourceJson (Zod validation)
 * Stage 2.1: enrich columns (relation types, enum injection, field variants)
 * Stage 2.2: build data.fields from enriched columns
 * Stage 2.3: build schemas (layouts → data+ui pairs)
 * Stage 2.4: build operations record
 * Stage 2.5: i18n keys (stub — empty for now)
 * Stage 2.6: assemble NormalizedResource
 *
 * The `model` in ResourceInput fills optional field metadata (required);
 * explicit column values always win.
 */
export const normalizeResource = (input: ResourceInput): NormalizeResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Stage 2.0 — parse
  const parseResult = ResourceJsonSchema.safeParse(input.resource);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map(
      (i) => `${i.path.join('.')}: ${i.message}`,
    );
    // Return a minimal placeholder so callers always get a full NormalizeResult shape
    return NormalizeResultSchema.parse({
      resource: {
        id: 'invalid',
        name: 'invalid',
        route: 'invalid',
        uri: '',
        title: 'invalid',
        kind: 'custom',
        display: { mode: 'modal', customComponent: null },
        operations: {},
        schemas: {},
        data: {
          idField: 'id',
          fields: {},
          include: { findAll: [], findOne: [] },
        },
      },
      errors: issues,
      warnings,
    });
  }
  const json = parseResult.data;

  // Stage 2.1 — enrich columns (mirrors compileResource internals, schema=undefined)
  const rawColumns = (json.columns ?? []) as JsonColumn[];
  const requiredSet = new Set<string>(input.model?.required ?? []);
  let columns: JsonColumn[] = enrichRelationTypes(
    applyRelationFormatDefault(rawColumns) ?? rawColumns,
    undefined,
  );
  injectEnumValues(columns, input.enums);
  const subResourceStubs: { column: string; childRoute: string; relationType?: string }[] = [];
  columns = resolveColumnFieldVariants(
    enrichActionColumns(columns, json.route, subResourceStubs, input.baseUrl) ?? columns,
  )!;
  // Stage 2.2 — data.fields
  const fields: Record<string, DataField> = Object.fromEntries(
    columns.map((col) => [
      col.id,
      colToDataField(col, requiredSet.has(col.id)),
    ]),
  );

  // Stage 2.3 — schemas via compileResource + layout
  // compileResource is the canonical layout builder — reuse it; schema=undefined
  const compiled = compileResource(json, undefined, input.baseUrl, input.enums);
  const baseUri = json.parent
    ? `${input.baseUrl ?? ''}/${json.parent.route}/{${json.parent.param}}/${json.route}`
    : `${input.baseUrl ?? ''}/${json.route}`;

  const rawSchemas = Object.fromEntries(
    Object.entries(compiled.views ?? {}).map(([key, v]) => [
      key,
      { data: v.json_schema ?? v.data ?? {}, ui: v.ui_schema ?? v.ui ?? {} },
    ]),
  );

  // Inject table actions/sort/filter into table schema (mirrors buildViewsPayload)
  const filterSchema = rawSchemas['filter'] as { data: unknown; ui: unknown } | undefined;
  delete (rawSchemas as Record<string, unknown>)['filter'];
  if (rawSchemas['table']) {
    const tableUi = rawSchemas['table'].ui as any;
    const injectTableOptions = (ui: any): any => {
      if (!ui) return ui;
      const tableNode = ui.type === 'Table' ? ui : ui.elements?.find((e: any) => e?.type === 'Table');
      if (!tableNode) return ui;
      const layoutTableNode = resolveTableNode(json.layout?.table);
      const rowActs = resolveActions(baseUri, layoutTableNode?.rowActions as any);
      const tableActs = resolveTableActions(baseUri, layoutTableNode?.tableActions as any);
      const opts = {
        ...(tableActs.length && { tableActions: tableActs }),
        ...(rowActs.length && { rowActions: rowActs }),
        ...(compiled.views?.['table']?.defaultSort && { defaultSortId: compiled.views['table'].defaultSort }),
        ...(compiled.views?.['table']?.defaultSortDir && { defaultSortDir: compiled.views['table'].defaultSortDir }),
        ...(filterSchema && { filter: { schema: filterSchema.data, uischema: filterSchema.ui, initialData: {} } }),
      };
      const patchNode = (node: any) => ({ ...node, options: { ...(node.options ?? {}), ...opts } });
      return ui.type === 'Table'
        ? patchNode(ui)
        : { ...ui, elements: ui.elements.map((e: any) => e?.type === 'Table' ? patchNode(e) : e) };
    };
    rawSchemas['table'] = { ...rawSchemas['table'], ui: injectTableOptions(tableUi) };
  }

  // Stage 2.4 — operations
  const definition = resolveDefinition(compiled);
  const operations: Record<string, { enabled: boolean; uri: string; method: string; external?: boolean }> = {};
  for (const op of RESOURCE_OPS) {
    if (!isOperationEnabled(definition, op)) continue;
    const extRoute = externalRouteFor(definition, op);
    const uri = extRoute ?? `${baseUri}${OP_SUFFIX[op]}`;
    const entry = definition[op];
    const method =
      (extRoute && typeof entry === 'object' && entry !== null && 'method' in entry
        ? (entry as { method?: string }).method?.toUpperCase()
        : undefined) ?? OP_METHOD[op];
    operations[op] = {
      enabled: true,
      uri,
      method,
      ...(extRoute && { external: true }),
    };
  }
  if (isOperationEnabled(definition, 'findAll') && !isOperationExternal(definition, 'findAll') && compiled.lookup) {
    operations['lookup'] = { enabled: true, uri: `${baseUri}?q={text}`, method: 'GET' };
  }

  // Stage 2.5 — i18n (stub)
  const i18n = { keys: {} as Record<string, string> };

  // Build NormalizedData
  const enrichedInclude = enrichIncludeWithSort(
    (compiled.include ?? []).map((e) => (typeof e === 'string' ? e : JSON.stringify(e))),
    columns,
  );
  const enrichedFindOneInclude = enrichIncludeWithSort(
    (compiled.findOneInclude ?? []).map((e) => (typeof e === 'string' ? e : JSON.stringify(e))),
    columns,
  );

  const data: NormalizedData = {
    model: input.model,
    ...(compiled.database && { datasource: compiled.database }),
    ...(compiled.table && { dbTable: compiled.table }),
    ...(compiled.model && { prismaModel: compiled.model }),
    idField: compiled.lookup?.key ?? 'id',
    idType: compiled.idType ?? 'string',
    fields,
    search: compiled.search ?? [],
    lookup: compiled.lookup,
    include: {
      findAll: (enrichedInclude ?? []).map((e) => (typeof e === 'string' ? e : (e as any).relation)),
      findOne: (enrichedFindOneInclude ?? []).map((e) => (typeof e === 'string' ? e : (e as any).relation)),
    },
    allowedIncludes: allowedIncludes(columns),
    valueLabels: buildValueLabelColumns(columns),
    computed: columns
      .filter((c) => (c as any).computed?.sql)
      .map((c) => ({
        id: c.id,
        sql: (c as any).computed.sql as string,
        type: ((c as any).computed.type as string | undefined) ?? 'string',
      })),
    subResources: [],
    actions: [],
  };

  // Stage 2.6 — assemble + validate
  const src = (json as any).source as { model?: string } | undefined;
  const resource = NormalizedResourceSchema.parse({
    id: (compiled as any).id ?? json.route,
    name: json.name,
    route: json.route,
    uri: baseUri,
    title: json.title ?? (json as any).tag ?? json.name,
    kind: json.kind ?? 'prisma',
    ...(json.parent && { parent: { route: json.parent.route, param: `${src?.model ?? json.name}Id` } }),
    display: compiled.display ?? { mode: 'modal', customComponent: null },
    modalSize: compiled.modalSize ?? 'sm',
    ...(json.security && { security: json.security }),
    operations,
    schemas: rawSchemas,
    data,
    extensions: {},
    i18n,
  });

  return { resource, errors, warnings };
};

/** Convenience: same as normalizeResource but throws on parse errors. */
export const normalizeResourceOrThrow = (input: ResourceInput): NormalizedResource => {
  const result = normalizeResource(input);
  if (result.errors.length) {
    throw new Error(`normalizeResource failed:\n${result.errors.join('\n')}`);
  }
  return result.resource;
};
