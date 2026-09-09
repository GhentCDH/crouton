import { buildSubResourceOperations } from '../data-source';
import type { JsonAction } from '../resource';
import { getResourceExtensions } from '../resource';
import type { CompiledResource } from './compiled-resource.schema';
import type { CompiledSubResourceConfig } from './compiled-sub-resource.schema';
import { externalRouteFor, isOperationEnabled, isOperationExternal, resolveDefinition, schemaFor, upsertOnFor } from './crud-config';
import { toJsonSchema } from './to-json-schema';

const pickExtensions = (config: CompiledResource) =>
  Object.fromEntries(
    [...getResourceExtensions().keys()]
      .filter((k) => (config as Record<string, unknown>)[k] !== undefined)
      .map((k) => [k, (config as Record<string, unknown>)[k]]),
  );

const resolveEnvPlaceholders = (value: string): string =>
  value.replace(
    /\{env\.([^}]+)\}/g,
    (match, varName) =>
      (typeof process !== 'undefined' ? process.env?.[varName] : undefined) ?? match,
  );

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
    RESOURCE_OPS.filter((op) => isOperationEnabled(definition, op)).map((op) => {
      const extRoute = externalRouteFor(definition, op);
      const uri = extRoute ? resolveEnvPlaceholders(extRoute) : `${baseUri}${OP_SUFFIX[op]}`;
      const entry = definition[op];
      const method =
        (extRoute && typeof entry === 'object' && entry !== null && 'method' in entry
          ? (entry as { method?: string }).method
          : undefined) ?? OP_METHOD[op];
      return [op, { uri, method }];
    }),
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
  const { route, name, tag, idType = 'string' } = config;
  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne') ?? listSchema;
  const createSchema = schemaFor(definition, 'create');
  const updateSchema = schemaFor(definition, 'update');
  const patchSchema = schemaFor(definition, 'patch');
  const upsertSchema = schemaFor(definition, 'upsert') ?? createSchema;

  const operations = (
    ['findAll', 'findOne', 'create', 'update', 'patch', 'upsert', 'delete'] as const
  ).filter((op) => isOperationEnabled(definition, op));

  return {
    name,
    route,
    idType,
    tag,
    operations,
    upsertOn: upsertOnFor(definition),
    display: config.display,
    schemas: {
      ...(listSchema && { findAll: toJsonSchema(listSchema) }),
      ...(oneSchema && { findOne: toJsonSchema(oneSchema) }),
      ...(createSchema && { create: toJsonSchema(createSchema) }),
      ...(updateSchema && { update: toJsonSchema(updateSchema) }),
      ...(patchSchema && { patch: toJsonSchema(patchSchema) }),
      ...(isOperationEnabled(definition, 'upsert') && upsertSchema
        ? { upsert: toJsonSchema(upsertSchema) }
        : {}),
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
  if (!isOperationExternal(definition, 'findAll')) {
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
  const operations: Record<string, unknown> = buildResourceOperations(definition, baseUri);
  if (isOperationEnabled(definition, 'findAll') && !isOperationExternal(definition, 'findAll')) {
    operations['lookup'] = `${baseUri}?q={text}`;
  }
  const schemas = Object.fromEntries(
    Object.entries(config.views).map(([key, v]) => [
      key,
      {
        data: v.json_schema,
        ui: v.ui_schema,
        ...(v.defaultSort !== undefined && { defaultSort: v.defaultSort }),
      },
    ]),
  );
  const baseAction = `${baseUri}${config.route}`;
  return {
    id: config.id ?? config.route,
    name: config.name,
    route: config.route,
    uri: baseUri,
    title: config.title ?? config.tag,
    idField: config.lookup?.key ?? 'id',
    idType: config.idType ?? 'string',
    ...(config.modalSize && { modalSize: config.modalSize }),
    operations,
    display: config.display,
    schemas,
    actions: resolveActions(baseAction, config.actions),
    tableActions: resolveTableActions(baseAction, config.tableActions),
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
    idType: sub.idType ?? 'string',
    ...(sub.modalSize && { modalSize: sub.modalSize }),
    // ponytail: cast because JsonOperationsSchema uses boolean|{security?} but buildSubResourceOperations wants boolean
    operations: buildSubResourceOperations(sub.operations as any, childUri, sub.idField ?? 'id'),
    schemas: Object.fromEntries(
      Object.entries(sub.views).map(([key, v]) => [
        key,
        {
          data: v.json_schema,
          ui: v.ui_schema,
          ...(v.defaultSort !== undefined && { defaultSort: v.defaultSort }),
        },
      ]),
    ),
    actions: resolveActions(`${baseUrl}/${sub.childRoute}`, sub.actions),
  };
};
