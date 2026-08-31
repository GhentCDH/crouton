import { type JsonResourceOperations, type SecurityConfig } from '@ghentcdh/crouton-core';

import { type Resource } from './resource/ResourceConfig.schema';
import type { SubResourceConfig } from './resource/SubResource.schema';
import { type ResourceDefinition } from './resource/defintion.schema';
import { type SchemaInput } from './resource/json.schema';

export { isRowProcedureAction, isTableProcedureAction } from './action';

export type CrudOperation =
  'findAll' | 'findOne' | 'create' | 'update' | 'patch' | 'upsert' | 'delete';

// ─── helpers ────────────────────────────────────────────────────────────────

export const resolveDefinition = (config: Resource): ResourceDefinition => {
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

export const upsertOnFor = (
  def: ResourceDefinition,
): string | string[] | undefined => def.upsert?.upsertOn;

// ─── security ────────────────────────────────────────────────────────────────

/** Extract security from an operation entry (works for both JSON and typed defs). */
const opSecurity = (entry: unknown): SecurityConfig | undefined => {
  if (!entry || entry === true) return undefined;
  return (entry as { security?: SecurityConfig }).security;
};

/** Effective security for one operation: op-level → resource global → module default. */
export const securityFor = (
  config: Resource,
  def: ResourceDefinition,
  op: CrudOperation,
  moduleDefault?: SecurityConfig,
): SecurityConfig | undefined =>
  opSecurity(def[op]) ?? config.security ?? moduleDefault;

/** Same precedence for sub-resources: op-level → parent global → module default. */
export const securityForSub = (
  config: Resource,
  sub: SubResourceConfig,
  op: CrudOperation,
  moduleDefault?: SecurityConfig,
): SecurityConfig | undefined => {
  const entry = sub.operations[op];
  return opSecurity(entry) ?? config.security ?? moduleDefault;
};
