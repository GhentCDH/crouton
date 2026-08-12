import {
  type FieldInput,
  type JsonColumn,
  resolveTableField,
  resolveViewField,
} from '@ghentcdh/crouton-core';

import { type ResourceRowAction } from '../action';
import {
  isOperationEnabled,
  resolveDefinition,
  schemaFor,
  upsertOnFor,
} from '../crud.config';
import { type Resource } from '../resource/ResourceConfig.schema';
import type { SubResourceConfig } from '../resource/SubResource.schema';
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
        Record<
          'findAll' | 'findOne' | 'create' | 'update' | 'patch' | 'delete',
          boolean
        >
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
      update: { uri: `${baseUri}/${idPlaceholder}`, method: 'put' },
    }),
    ...(ops.patch && {
      patch: { uri: `${baseUri}/${idPlaceholder}`, method: 'patch' },
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
  'patch',
  'delete',
] as const;
type ResourceOp = (typeof RESOURCE_OPS)[number];

const OP_METHOD: Record<ResourceOp, string> = {
  findAll: 'get',
  findOne: 'get',
  create: 'post',
  update: 'put',
  patch: 'patch',
  delete: 'delete',
};
const OP_SUFFIX: Record<ResourceOp, string> = {
  findAll: '',
  findOne: '/{id}',
  create: '',
  update: '/{id}',
  patch: '/{id}',
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
  const patchSchema = schemaFor(definition, 'patch');
  const upsertSchema = schemaFor(definition, 'upsert') ?? createSchema;

  const operations = (
    [
      'findAll',
      'findOne',
      'create',
      'update',
      'patch',
      'upsert',
      'delete',
    ] as const
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

const _resolveActions = (
  baseUrl: string[],
  actions: ResourceRowAction[] | undefined,
) => {
  if (!actions?.length) return [];
  const resolved = actions.map((a) =>
    a.type === 'link'
      ? {
          ...a,
          href: resolveEnvPlaceholders(a.href),
        }
      : {
          ...a,
          uri: baseUrl.map((b) => (b === '{actionId}' ? a.id : b)).join('/'),
          method: a.method ?? 'post',
        },
  );
  return resolved;
};

export const resolveActions = (
  baseUrl: string,
  actions: ResourceRowAction[] | undefined,
) => {
  return _resolveActions([baseUrl, 'procedure', '{actionId}', '{id}'], actions);
};

export const resolveTableActions = (
  baseUrl: string,
  actions: ResourceRowAction[] | undefined,
) => {
  return _resolveActions([baseUrl, 'table-action', '{actionId}'], actions);
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
  const baseAction = `${baseUri}${config.route}`;
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
    actions: resolveActions(baseAction, config.actions),
    tableActions: resolveActions(baseAction, config.tableActions),
  };
};

/**
 * Build the payload for a sub-resource's `GET /<child>/schemas` endpoint.
 * Returns `undefined` when the sub-resource has no views configured.
 */
export const buildSubResourceViewsPayload = (
  config: Resource,
  sub: SubResourceConfig,
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
    operations: buildSubResourceOperations(
      sub.operations,
      childUri,
      sub.idField ?? 'id',
    ),
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

/**
 * A rendering-context's field config as exposed to the visual builder: the
 * resolved value (walking the `fieldInput → fieldView → fieldTable` fallback
 * chain, via crouton-core's `resolveViewField`/`resolveTableField` — so the
 * editor shows what will actually render) plus whether this column has its
 * own override at this level. `hasOverride: false` means the value shown is
 * pure inheritance from the level below; saving with no changes here should
 * leave it that way rather than pinning a copy into `fieldView`/`fieldTable`.
 */
export type EditableFieldVariant = {
  resolved: FieldInput | undefined;
  hasOverride: boolean;
};

export type EditableColumn = {
  id: string;
  label?: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  /** The base level — always "owned" by this column, no fallback/override distinction. */
  form: FieldInput | undefined;
  view: EditableFieldVariant;
  table: EditableFieldVariant;
};

/**
 * Build the payload for `GET /resource-columns` — the raw, editable column
 * list backing the visual resource builder (dev-mode only). Unlike
 * `buildResourceJsonPayload`/`buildViewsPayload`, which expose columns only
 * as compiled JSON Schema + JSONForms UI Schema, this returns the plain
 * per-column attributes the editor lets a developer change directly, split
 * per rendering context (form/view/table) so the editor can offer a tab per
 * context instead of one flat fieldInput-only row.
 *
 * `config.columns` is typed as the pre-normalization map form on `Resource`
 * (inherited from `ResourceJsonShape`), but at runtime it always holds the
 * post-`ResourceJsonSchema`-transform array form (`JsonColumn[]`) — the same
 * assumption other adapter code in this package already relies on.
 */
export const buildEditableColumnsPayload = (
  config: Resource,
): {
  id: string;
  route: string;
  columns: EditableColumn[];
} => {
  const columns = (config.columns as unknown as JsonColumn[] | undefined) ?? [];

  return {
    id: config.name,
    route: config.route,
    columns: columns.map((c) => ({
      id: c.id,
      label: c.label,
      column: c.column ?? c.id,
      hiddenInTable: c.hiddenInTable,
      hiddenInForm: c.hiddenInForm,
      hiddenInView: c.hiddenInView,
      form: c.fieldInput,
      view: { resolved: resolveViewField(c), hasOverride: c.fieldView != null },
      table: {
        resolved: resolveTableField(c),
        hasOverride: c.fieldTable != null,
      },
    })),
  };
};
