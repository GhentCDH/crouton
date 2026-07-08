import { type Resource } from './resource/ResourceConfig.schema';
import { type ResourceDefinition } from './resource/defintion.schema';
import { type SchemaInput } from './resource/json.schema';

export { isRowProcedureAction, isTableProcedureAction } from './action';

export type CrudOperation =
  'findAll' | 'findOne' | 'create' | 'update' | 'upsert' | 'delete';

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
