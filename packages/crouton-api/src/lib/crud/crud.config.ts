import { type CrudOperation, type SecurityConfig } from '@ghentcdh/crouton-core';

export {
  type CrudOperation,
  externalRouteFor,
  isOperationEnabled,
  isOperationExternal,
  resolveDefinition,
  schemaFor,
} from '@ghentcdh/crouton-core';

export { isRowProcedureAction, isTableProcedureAction } from './action';

import { type Resource } from './resource/ResourceConfig.schema';
import type { SubResourceConfig } from './resource/SubResource.schema';
import { type ResourceDefinition } from './resource/defintion.schema';

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
  opSecurity((def as Record<string, unknown>)[op]) ?? config.security ?? moduleDefault;

/** Same precedence for sub-resources: op-level → parent global → module default. */
export const securityForSub = (
  config: Resource,
  sub: SubResourceConfig,
  op: CrudOperation,
  moduleDefault?: SecurityConfig,
): SecurityConfig | undefined => {
  const entry = (sub.operations as Record<string, unknown>)[op];
  return opSecurity(entry) ?? config.security ?? moduleDefault;
};
