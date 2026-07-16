import {
  isOperationEnabled,
  resolveDefinition,
  schemaFor,
  upsertOnFor,
} from '../crud.config';
import { type Resource } from '../resource/ResourceConfig.schema';
import { toJsonSchema } from '../schema.utils';

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Replace `{env.VAR_NAME}` placeholders with `process.env.VAR_NAME`.
 * Unknown variables are left as-is.
 */
export const resolveEnvPlaceholders = (value: string): string =>
  value.replace(
    /\{env\.([^}]+)\}/g,
    (match, varName) => process.env[varName] ?? match,
  );

/**
 * Build an operations map for a sub-resource with full URIs.
 * `baseUri` is the collection endpoint, e.g. `http://host/text/{id}/content`.
 */
export const buildSubResourceOperations = (
  ops:
    | Partial<
        Record<'findAll' | 'findOne' | 'create' | 'update' | 'delete', boolean>
      >
    | undefined,
  baseUri: string,
  idField = 'id',
): Record<string, unknown> => {
  if (!ops) return {};
  const idPlaceholder = `{${idField}}`;
  return {
    ...(ops.findAll && { findAll: { uri: baseUri, method: 'get' } }),
    ...(ops.findOne && {
      findOne: { uri: `${baseUri}/${idPlaceholder}`, method: 'get' },
    }),
    ...(ops.create && { create: { uri: baseUri, method: 'post' } }),
    ...(ops.update && {
      update: { uri: `${baseUri}/${idPlaceholder}`, method: 'patch' },
    }),
    ...(ops.delete && {
      delete: { uri: `${baseUri}/${idPlaceholder}`, method: 'delete' },
    }),
  };
};

const RESOURCE_OPS = [
  'findAll',
  'findOne',
  'create',
  'update',
  'delete',
] as const;
type ResourceOp = (typeof RESOURCE_OPS)[number];

const OP_METHOD: Record<ResourceOp, string> = {
  findAll: 'get',
  findOne: 'get',
  create: 'post',
  update: 'patch',
  delete: 'delete',
};
const OP_SUFFIX: Record<ResourceOp, string> = {
  findAll: '',
  findOne: '/{id}',
  create: '',
  update: '/{id}',
  delete: '/{id}',
};

/** Build an operations map for a top-level resource with full URIs. */
export const buildResourceOperations = (
  definition: ReturnType<typeof resolveDefinition>,
  baseUri: string,
): Record<string, unknown> =>
  Object.fromEntries(
    RESOURCE_OPS.filter((op) => isOperationEnabled(definition, op)).map(
      (op) => [
        op,
        { uri: `${baseUri}${OP_SUFFIX[op]}`, method: OP_METHOD[op] },
      ],
    ),
  );

// ── Public payload builders ───────────────────────────────────────────────

/** Build the payload for `GET /definition` — enabled operations and their JSON Schemas. */
export const buildDefinitionPayload = (
  config: Resource,
): Record<string, unknown> => {
  const { route, name, tag, idType = 'string' } = config;
  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne') ?? listSchema;
  const createSchema = schemaFor(definition, 'create');
  const updateSchema = schemaFor(definition, 'update');
  const upsertSchema = schemaFor(definition, 'upsert') ?? createSchema;

  const operations = (
    ['findAll', 'findOne', 'create', 'update', 'upsert', 'delete'] as const
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
      ...(isOperationEnabled(definition, 'upsert') && upsertSchema
        ? { upsert: toJsonSchema(upsertSchema) }
        : {}),
    },
  };
};

/** Build the payload for `GET /resource.json` — URI, enabled operations, and optional form schema. */
export const buildResourceJsonPayload = (
  config: Resource,
  baseUrl?: string,
): Record<string, unknown> => {
  const { name, route } = config;
  const definition = resolveDefinition(config);
  const uri = `${baseUrl}/${route}`;
  const operations: any = Object.fromEntries(
    RESOURCE_OPS.map((op) => [op, isOperationEnabled(definition, op)]),
  );
  operations.lookup = `${uri}?q={text}`;

  const form = config.views?.['form'];
  const schema = form?.json_schema
    ? { data: form.json_schema, ui: form.ui_schema }
    : null;

  return { id: name, uri, operations, schema };
};

/**
 * Build the payload for `GET /schemas` — view schemas (table/form), operations, and actions.
 * Returns `undefined` when the resource has no views configured.
 */
export const buildViewsPayload = (
  config: Resource,
  baseUrl?: string,
): Record<string, unknown> | undefined => {
  if (!config.views || !Object.keys(config.views).length) return undefined;
  const definition = resolveDefinition(config);
  const baseUri = `${baseUrl}/${config.route}`;
  const operations: Record<string, unknown> = buildResourceOperations(
    definition,
    baseUri,
  );
  if (isOperationEnabled(definition, 'findAll')) {
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
  return {
    id: config.name,
    name: config.name,
    route: config.route,
    uri: `${baseUrl}/${config.route}`,
    title: config.title ?? config.tag,
    idField: config.lookup?.key ?? 'id',
    idType: config.idType ?? 'string',
    ...(config.modalSize && { modalSize: config.modalSize }),
    operations,
    display: config.display,
    schemas,
    ...(config.actions?.length && {
      actions: config.actions.map((a) =>
        a.type === 'link'
          ? {
              type: 'link',
              id: a.id,
              label: a.label,
              href: resolveEnvPlaceholders(a.href),
              ...(a.icon && { icon: a.icon }),
              ...(a.tooltip && { tooltip: a.tooltip }),
              ...(a.condition && { condition: a.condition }),
            }
          : {
              id: a.id,
              label: a.label,
              uri: `${baseUrl}/${config.route}/procedure/${a.id}/{id}`,
              method: a.method ?? 'post',
              ...(a.data && { data: a.data }),
              ...(a.icon && { icon: a.icon }),
              ...(a.tooltip && { tooltip: a.tooltip }),
              ...(a.condition && { condition: a.condition }),
            },
      ),
    }),
    ...(config.tableActions?.length && {
      tableActions: config.tableActions.map((a) =>
        a.type === 'link'
          ? {
              type: 'link',
              id: a.id,
              label: a.label,
              icon: a.icon,
              tooltip: a.tooltip,
              href: resolveEnvPlaceholders(a.href),
              ...(a.condition && { condition: a.condition }),
            }
          : {
              id: a.id,
              label: a.label,
              icon: a.icon,
              tooltip: a.tooltip,
              uri: `${baseUrl}/${config.route}/table-action/${a.id}`,
              method: a.method ?? 'post',
              ...(a.data && { data: a.data }),
              ...(a.condition && { condition: a.condition }),
            },
      ),
    }),
  };
};
