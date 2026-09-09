import type { JsonResourceOperations } from '../data-source';
import type { ResourceDefinition } from './definition.schema';
import type { SchemaInput } from './schema-input';

export type CrudOperation =
  | 'findAll'
  | 'findOne'
  | 'create'
  | 'update'
  | 'patch'
  | 'delete';

export const resolveDefinition = (config: {
  definition: ResourceDefinition | (() => ResourceDefinition);
}): ResourceDefinition => {
  const def = config.definition;
  return typeof def === 'function' ? def() : def;
};

export const isOperationEnabled = (
  def: ResourceDefinition | JsonResourceOperations,
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

export const isOperationExternal = (
  def: ResourceDefinition | JsonResourceOperations,
  op: CrudOperation,
): boolean => {
  const entry = def[op];
  return typeof entry === 'object' && entry !== null && 'uri' in entry;
};

export const externalRouteFor = (
  def: ResourceDefinition | JsonResourceOperations,
  op: CrudOperation,
): string | undefined => {
  const entry = def[op];
  if (typeof entry === 'object' && entry !== null && 'uri' in entry) {
    return (entry as { uri: string }).uri;
  }
  return undefined;
};

