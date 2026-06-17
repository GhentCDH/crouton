import { type ZodObject, type ZodRawShape } from 'zod';

import type {
  CalculatedColumn,
  FieldInput,
  JsonAction,
  JsonActionCondition,
  JsonIncludeEntry
} from './loader/json-config.types';

export type ResourceProcedureAction = {
  type?: 'procedure';
  /** URL segment used in the endpoint: `POST /{route}/procedure/{id}/:recordId` */
  id: string;
  /** Human-readable label shown as a button in the table. */
  label: string;
  /** HTTP method for the endpoint. Defaults to `"post"`. */
  method?: string;
  /** Static data payload merged into the request body by the frontend. */
  data?: Record<string, unknown>;
  /** The procedure function to call with (prisma, recordId). */
  procedure: (prisma: any, recordId: string | number) => Promise<any>;
  /** Optional condition evaluated per row. Button is hidden when false. */
  condition?: JsonActionCondition;
};

export type ResourceLinkAction = {
  type: 'link';
  /** Unique identifier for the action. */
  id: string;
  /** Human-readable label shown as a button in the table. */
  label: string;
  /**
   * URL pattern to open in a new tab. May contain `{id}` which the frontend
   * replaces with the record id, e.g. `"/preview/{id}"`.
   */
  href: string;
  /** Optional condition evaluated per row. Button is hidden when false. */
  condition?: JsonActionCondition;
};

export type ResourceAction = ResourceProcedureAction | ResourceLinkAction;

// ─── Table-level (global) actions ────────────────────────────────────────────

/** Table-level procedure action — no record id is passed to the procedure. */
export type ResourceTableProcedureAction = {
  type?: 'procedure';
  id: string;
  label?: string;
  icon?: string;
  tooltip?: string;
  method?: string;
  data?: Record<string, unknown>;
  /** The procedure function called with only prisma (no record id). */
  procedure: (prisma: any) => Promise<any>;
};

export type ResourceTableLinkAction = {
  type: 'link';
  id: string;
  label?: string;
  icon?: string;
  tooltip?: string;
  href: string;
};

export type ResourceTableAction =
  | ResourceTableProcedureAction
  | ResourceTableLinkAction;

export type CrudOperation =
  | 'findAll'
  | 'findOne'
  | 'create'
  | 'update'
  | 'upsert'
  | 'delete';

export type SchemaInput = ZodObject<ZodRawShape> | JsonSchemaInput;

export interface JsonSchemaInput {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/** @deprecated Use `JsonSchemaInput` instead — `JsonSchema` clashes with the `@jsonforms/core` type of the same name. */
export type JsonSchema = JsonSchemaInput;

export type WriteOp = 'create' | 'update' | 'upsert' | 'delete';
export type ReadOp = 'findAll' | 'findOne';

export interface WriteHookContext<PRISMACLIENT> {
  prisma: PRISMACLIENT;
  op: WriteOp;
  /** The record id for `update`; `undefined` for `create`/`upsert`. */
  id?: string | number;
}

export interface ReadHookContext<PRISMACLIENT> {
  prisma: PRISMACLIENT;
  op: ReadOp;
}

export interface ResourceHooks<PRISMACLIENT> {
  /**
   * Runs before the data is passed to Prisma for create/update/upsert.
   * Use this to connect-or-create related entities.
   */
  beforeWrite?: (
    data: any,
    ctx: WriteHookContext<PRISMACLIENT>,
  ) => Promise<any> | any;
  /**
   * Runs after Prisma has persisted the record for create/update/delete.
   * For upsert the op is resolved to `'create'` or `'update'` depending on
   * whether a matching record existed before the operation.
   * Receives the persisted record; the return value replaces the response.
   */
  afterWrite?: (
    result: any,
    ctx: WriteHookContext<PRISMACLIENT>,
  ) => Promise<any> | any;
  /**
   * Runs on every row returned by findAll / findOne. Use this to
   * decorate rows with derived fields (e.g. URIs).
   */
  afterRead?: (
    row: any,
    ctx: ReadHookContext<PRISMACLIENT>,
  ) => Promise<any> | any;
}

/**
 * Per-operation descriptor. Use `true` to enable with no schema, or
 * an object to also attach a schema (request body for write ops, row
 * projection for read ops). For read operations the schema also drives
 * the Prisma `select` — nested zod objects/arrays become nested
 * `select` clauses, which transparently load relations.
 */
export type OperationDef =
  | true
  | {
      schema?: SchemaInput;
    };

export type UpsertOperationDef = {
  schema?: SchemaInput;
  upsertOn: string | string[];
};

export interface ResourceDefinition {
  findAll?: OperationDef;
  findOne?: OperationDef;
  create?: OperationDef;
  update?: OperationDef;
  upsert?: UpsertOperationDef;
  delete?: OperationDef;
}

export type DefinitionCallback = () => ResourceDefinition;

// ─── view / resource config ──────────────────────────────────────────────────

export type ViewColumnConfig = {
  id: string;
  label?: string;
  sortable?: boolean;
  searchable?: boolean;
  fieldInput?: FieldInput;
};

export type ViewConfig = {
  json_schema: Record<string, unknown>;
  ui_schema: Record<string, unknown>;
  columns: ViewColumnConfig[];
  defaultSort?: string;
};

/**
 * A column whose stored scalar is serialized as `{ value, label }` on read and
 * normalized back to the scalar on write. Computed at load time from columns
 * flagged `fieldInput.options.emitObject` that carry an `options.values` list.
 */
export type ValueLabelColumn = {
  /** Row field/key to transform. */
  field: string;
  values: { value: unknown; label: string }[];
};

export type LookupConfig = {
  /** The primary key field name (used for id-based lookups). */
  key: string;
  /**
   * The field used for text search (`?q=`). When absent, `?q=` is silently ignored.
   * Derived from the first `showInLookup` column, then first `searchable` column.
   */
  label?: string;
};

/**
 * Describes a sub-resource relation exposed as `GET /:id/{childRoute}`.
 * The parent `findAll` response includes a count for the relation column.
 */
export type SubResourceConfig = {
  /** Column id in the parent resource that holds the count, e.g. `"text_author"`. */
  column: string;
  /** Prisma relation field name on the parent model, e.g. `"text_author"`. */
  relation: string;
  /** Route segment for the sub-resource endpoint, e.g. `"author"`. */
  childRoute: string;
  /** Prisma model name of the child, e.g. `"text_author"`. */
  childModel: string;
  /** FK field on the child model pointing back to the parent, e.g. `"text_id"`. */
  foreignKey: string;
  /** Human-readable name for the child resource. */
  name?: string;
  /** Display title for the child resource. */
  title?: string;
  /** Primary key field name on the child model. */
  idField?: string;
  /** Primary key type on the child model. */
  idType?: 'string' | 'number';
  /** View schemas (table/form/view) for the child resource. */
  views?: Record<string, ViewConfig>;
  /** Enabled operations on the child resource. */
  operations?: Partial<
    Record<'findAll' | 'findOne' | 'create' | 'update' | 'delete', boolean>
  >;
  /** Actions declared in the child resource.json (serializable form, no procedure functions). */
  actions?: JsonAction[];
  /** Modal width when opening a form for this sub-resource. */
  modalSize?: 'xs' | 'sm' | 'lg' | 'xl';
  /** Relations to include when querying this sub-resource. Supports nested includes — see `JsonIncludeEntry`. */
  include?: JsonIncludeEntry[];
  /** Calculated columns to compute and merge for each row of this sub-resource. */
  calculatedColumns?: CalculatedColumn[];
  /** When true, the relation is included in findOne responses (column is visible in form or view). */
  includeInFindOne?: boolean;
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks?: ResourceHooks;
  /** Columns serialized as `{ value, label }` on read / unwrapped on write. */
  valueLabelColumns?: ValueLabelColumn[];
};

export type ResourceConfig = {
  name: string;
  route: string;
  model: string;
  tag: string;
  title?: string;
  /** Primary key field name on the model. Defaults to `"id"`. */
  idField?: string;
  idType?: 'number' | 'string';
  database?: string;
  sidebar?: { hide?: boolean; position?: number };
  hooks?: ResourceHooks;
  definition: ResourceDefinition | DefinitionCallback;
  views?: Record<string, ViewConfig>;
  lookup?: LookupConfig;
  subResources?: SubResourceConfig[];
  calculatedColumns?: CalculatedColumn[];
  actions?: ResourceAction[];
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions?: ResourceTableAction[];
  /** Relations to eagerly include when querying this resource. Supports nested includes — see `JsonIncludeEntry`. */
  include?: JsonIncludeEntry[];
  /** Modal width when opening a form for this resource. */
  modalSize?: 'xs' | 'sm' | 'lg' | 'xl';
  /** Columns serialized as `{ value, label }` on read / unwrapped on write. */
  valueLabelColumns?: ValueLabelColumn[];
};

// ─── helpers ────────────────────────────────────────────────────────────────

export const resolveDefinition = (
  config: ResourceConfig,
): ResourceDefinition => {
  const def = config.definition;
  return typeof def === 'function' ? def() : def;
};

export const isOperationEnabled = (
  def: ResourceDefinition,
  op: CrudOperation,
): boolean => def[op] != null;

export const schemaFor = (
  def: ResourceDefinition,
  op: CrudOperation,
): SchemaInput | undefined => {
  const entry = def[op];
  if (!entry || entry === true) return undefined;
  return (entry as { schema?: SchemaInput }).schema;
};

export const upsertOnFor = (
  def: ResourceDefinition,
): string | string[] | undefined => def.upsert?.upsertOn;
