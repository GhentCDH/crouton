import { type ResourceRowAction, type ResourceTableAction } from './action';
import type {
  CalculatedColumn,
  JsonIncludeEntry,
} from './loader/json-config.types';
import {
  DefinitionCallback,
  ResourceDefinition,
} from './resource/defintion.schema';
import { SchemaInput } from './resource/json.schema';
import { JsonDisplay } from '@ghentcdh/crouton-core';
import { ValueLabelColumn } from './resource/valueLabel';
import { SubResourceConfig } from './resource/SubResource.schema';
import { LookupConfig } from './resource/lookup.schema';
import { ViewConfig } from './resource/view.schema';
import { ResourceHooks } from './hooks';
import { Resource } from './resource/ResourceConfig.schema';

export { isRowProcedureAction, isTableProcedureAction } from './action';

export type CrudOperation =
  'findAll' | 'findOne' | 'create' | 'update' | 'upsert' | 'delete';

/**
 * @deprecated should  ResourceSchema
 */
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
  actions?: ResourceRowAction[];
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions?: ResourceTableAction[];
  /** Relations to eagerly include when querying this resource. Supports nested includes — see `JsonIncludeEntry`. */
  include?: JsonIncludeEntry[];
  /** Modal width when opening a form for this resource. */
  modalSize?: 'xs' | 'sm' | 'lg' | 'xl';
  /** Columns serialized as `{ value, label }` on read / unwrapped on write. */
  valueLabelColumns?: ValueLabelColumn[];
  display: JsonDisplay;
};

// ─── helpers ────────────────────────────────────────────────────────────────

export const resolveDefinition = (config: Resource): ResourceDefinition => {
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
