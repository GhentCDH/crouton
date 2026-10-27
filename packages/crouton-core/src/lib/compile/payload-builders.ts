import { buildSubResourceOperations } from '../data-source';
import type { LayoutNode } from '../layout/schema/LayoutNode.schema';
import { allowedIncludes } from '../request/include';
import type { JsonAction } from '../resource';
import { pickExtensions } from '../resource/extensions';
import { readEnv } from '../utils/env';
import { resolveTableNode } from '../view';
import type { CompiledResource } from './compiled-resource.schema';
import type { CompiledSubResourceConfig } from './compiled-sub-resource.schema';
import {
  externalRouteFor,
  isOperationEnabled,
  isOperationExternal,
  resolveDefinition,
  schemaFor,
} from './crud-config';
import { toJsonSchema } from './to-json-schema';

interface TableInjectOptions {
  rowActions: unknown[];
  tableActions: unknown[];
  defaultSortId?: string;
  defaultSortDir?: 'asc' | 'desc';
  filter?: { schema: unknown; uischema: unknown; initialData: Record<string, never> };
}

const injectTableOptions = (ui: unknown, opts: TableInjectOptions): unknown => {
  if (!ui || typeof ui !== 'object') return ui;
  const u = ui as Record<string, unknown>;
  if (u['type'] === 'Table') {
    return {
      ...u,
      options: {
        ...((u['options'] as object) ?? {}),
        ...(opts.tableActions.length && { tableActions: opts.tableActions }),
        ...(opts.rowActions.length && { rowActions: opts.rowActions }),
        ...(opts.defaultSortId !== undefined && { defaultSortId: opts.defaultSortId }),
        ...(opts.defaultSortDir !== undefined && { defaultSortDir: opts.defaultSortDir }),
        ...(opts.filter && { filter: opts.filter }),
      },
    };
  }
  if (Array.isArray(u['elements'])) {
    return {
      ...u,
      elements: (u['elements'] as unknown[]).map((e) =>
        (e as Record<string, unknown>)['type'] === 'Table' ? injectTableOptions(e, opts) : e,
      ),
    };
  }
  return u;
};


const resolveEnvPlaceholders = (value: string): string =>
  value.replace(/\{env\.([^}]+)\}/g, (match, varName) => readEnv(varName) ?? match);

const RESOURCE_OPS = [
  'findAll',
  'findOne',
  'create',
  'update',
  'patch',
  'delete',
] as const;
type ResourceOp = (typeof RESOURCE_OPS)[number];

const OP_SUFFIX: Record<ResourceOp, string> = {
  findAll: '',
  findOne: '/{id}',
  create: '',
  update: '/{id}',
  patch: '/{id}',
  delete: '/{id}',
};

const OP_METHOD: Record<ResourceOp, string> = {
  findAll: 'get',
  findOne: 'get',
  create: 'post',
  update: 'put',
  patch: 'patch',
  delete: 'delete',
};

export const buildResourceOperations = (
  definition: ReturnType<typeof resolveDefinition>,
  baseUri: string,
): Record<string, unknown> =>
  Object.fromEntries(
    RESOURCE_OPS.filter((op) => isOperationEnabled(definition, op)).map(
      (op) => {
        const extRoute = externalRouteFor(definition, op);
        const uri = extRoute
          ? resolveEnvPlaceholders(extRoute)
          : `${baseUri}${OP_SUFFIX[op]}`;
        const entry = definition[op];
        const method =
          (extRoute &&
          typeof entry === 'object' &&
          entry !== null &&
          'method' in entry
            ? (entry as { method?: string }).method
            : undefined) ?? OP_METHOD[op];
        return [op, { uri, method }];
      },
    ),
  );

const _resolveActions = (
  baseUrl: string[],
  actions: JsonAction[] | undefined,
) => {
  if (!actions?.length) return [];
  return actions.map((a) =>
    a.type === 'link'
      ? { ...a, href: resolveEnvPlaceholders(a.href) }
      : {
          ...a,
          uri: baseUrl.map((b) => (b === '{actionId}' ? a.id : b)).join('/'),
          method: a.method ?? 'post',
        },
  );
};

export const resolveActions = (
  baseUrl: string,
  actions: JsonAction[] | undefined,
) => _resolveActions([baseUrl, 'procedure', '{actionId}', '{id}'], actions);

export const resolveTableActions = (
  baseUrl: string,
  actions: JsonAction[] | undefined,
) => _resolveActions([baseUrl, 'table-action', '{actionId}'], actions);

export const buildDefinitionPayload = (
  config: CompiledResource,
): Record<string, unknown> => {
  const { route, name, tag } = config;
  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne') ?? listSchema;
  const createSchema = schemaFor(definition, 'create');
  const updateSchema = schemaFor(definition, 'update');
  const patchSchema = schemaFor(definition, 'patch');

  const operations = (
    ['findAll', 'findOne', 'create', 'update', 'patch', 'delete'] as const
  ).filter((op) => isOperationEnabled(definition, op));

  return {
    name,
    route,
    tag,
    operations,
    display: config.display,
    schemas: {
      ...(listSchema && { findAll: toJsonSchema(listSchema) }),
      ...(oneSchema && { findOne: toJsonSchema(oneSchema) }),
      ...(createSchema && { create: toJsonSchema(createSchema) }),
      ...(updateSchema && { update: toJsonSchema(updateSchema) }),
      ...(patchSchema && { patch: toJsonSchema(patchSchema) }),
    },
    ...pickExtensions(config),
  };
};

export const buildResourceJsonPayload = (
  config: CompiledResource,
  baseUrl?: string,
): Record<string, unknown> => {
  const { route } = config;
  const definition = resolveDefinition(config);
  const uri = `${baseUrl}/${route}`;
  const operations: Record<string, unknown> = Object.fromEntries(
    RESOURCE_OPS.map((op) => [op, isOperationEnabled(definition, op)]),
  );
  if (!isOperationExternal(definition, 'findAll') && config.lookup) {
    operations['lookup'] = `${uri}?q={text}`;
  }

  const form = config.views?.['form'];
  const schema = form?.json_schema
    ? { data: form.json_schema, ui: form.ui_schema }
    : null;

  return {
    id: config.id ?? route,
    uri,
    operations,
    schema,
    ...pickExtensions(config),
  };
};

export const buildViewsPayload = (
  config: CompiledResource,
  baseUrl?: string,
): Record<string, unknown> | undefined => {
  if (!config.views || !Object.keys(config.views).length) return undefined;
  const definition = resolveDefinition(config);
  const baseUri = config.parent
    ? `${baseUrl}/${config.parent.route}/{${config.parent.param}}/${config.route}`
    : `${baseUrl}/${config.route}`;
  const operations: Record<string, unknown> = buildResourceOperations(
    definition,
    baseUri,
  );
  if (
    isOperationEnabled(definition, 'findAll') &&
    !isOperationExternal(definition, 'findAll') &&
    config.lookup
  ) {
    operations['lookup'] = `${baseUri}?q={text}`;
  }
  const schemas = Object.fromEntries(
    Object.entries(config.views).map(([key, v]) => [
      key,
      { data: v.json_schema, ui: v.ui_schema, ...(v.columns?.length && { columns: v.columns }) },
    ]),
  );

  const tableSchema = schemas['table'] ?? {};
  const filterSchema = schemas['filter'] as Record<string, unknown> | undefined;
  delete (schemas as Record<string, unknown>)['filter'];
  (schemas as Record<string, unknown>)['table'] = {
    ...tableSchema,
    ui: injectTableOptions((tableSchema as Record<string, unknown>)['ui'], {
      rowActions: resolveActions(baseUri, resolveTableNode(config.layout?.table)?.rowActions),
      tableActions: resolveTableActions(baseUri, resolveTableNode(config.layout?.table)?.tableActions),
      defaultSortId: config.views['table']?.defaultSort,
      defaultSortDir: config.views['table']?.defaultSortDir,
      ...(filterSchema && {
        filter: { schema: filterSchema.data, uischema: filterSchema.ui, initialData: {} },
      }),
    }),
  };

  return {
    id: config.id ?? config.route,
    name: config.name,
    route: config.route,
    uri: baseUri,
    title: config.title ?? config.tag,
    idField: config.lookup?.key ?? 'id',
    ...(config.modalSize && { modalSize: config.modalSize }),
    operations,
    display: config.display,
    schemas,
    allowedIncludes: allowedIncludes(config.columns ?? []),
    ...pickExtensions(config),
  };
};

export const buildSubResourceViewsPayload = (
  config: CompiledResource,
  sub: CompiledSubResourceConfig,
  baseUrl?: string,
): Record<string, unknown> | undefined => {
  if (!sub.views) return undefined;
  const { route } = config;
  const childUri = `${baseUrl}/${route}/{parent.id}/${sub.childRoute}`;

  return {
    id: `${route}/${sub.childRoute}`,
    name: sub.name ?? sub.childRoute,
    route: sub.childRoute,
    uri: childUri,
    title: sub.title ?? sub.childRoute,
    idField: sub.idField ?? 'id',
    ...(sub.modalSize && { modalSize: sub.modalSize }),
    ...(sub.display && { display: sub.display }),
    operations: buildSubResourceOperations(
      sub.operations,
      childUri,
      sub.idField ?? 'id',
    ),
    schemas: (() => {
      const subSchemas = Object.fromEntries(
        Object.entries(sub.views).map(([key, v]) => [
          key,
          { data: v.json_schema, ui: v.ui_schema },
        ]),
      );
      const subTable = subSchemas['table'] ?? {};
      const subFilterSchema = subSchemas['filter'] as Record<string, unknown> | undefined;
      delete (subSchemas as Record<string, unknown>)['filter'];
      const subChildUri = `${baseUrl}/${sub.childRoute}`;
      const subExtra = sub as unknown as Record<string, unknown>;
      (subSchemas as Record<string, unknown>)['table'] = {
        ...subTable,
        ui: injectTableOptions((subTable as Record<string, unknown>)['ui'], {
          rowActions: resolveActions(subChildUri, resolveTableNode((subExtra['layout'] as Record<string, unknown> | undefined)?.['table'] as LayoutNode | undefined)?.rowActions ?? (subExtra['rowActions'] as JsonAction[] | undefined) ?? sub.actions),
          tableActions: resolveTableActions(subChildUri, resolveTableNode((subExtra['layout'] as Record<string, unknown> | undefined)?.['table'] as LayoutNode | undefined)?.tableActions ?? (subExtra['tableActions'] as JsonAction[] | undefined)),
          defaultSortId: sub.views['table']?.defaultSort,
          defaultSortDir: sub.views['table']?.defaultSortDir,
          ...(subFilterSchema && {
            filter: { schema: subFilterSchema.data, uischema: subFilterSchema.ui, initialData: {} },
          }),
        }),
      };
      return subSchemas;
    })(),
  };
};
