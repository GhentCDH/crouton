import {
  CUSTOM_OPS,
  type CustomParentRepository,
  type CustomRepository,
  PARENT_METHOD,
} from './custom-repository.types';
import { type CrudOperation, isOperationEnabled, resolveDefinition } from '../crud.config';
import { type Resource } from '../resource/ResourceConfig.schema';

/**
 * Check that a custom resource can actually serve what it advertises.
 *
 * Returns a human-readable problem, or `undefined` when the resource is sound.
 * Callers record the message on the load-error registry so it surfaces on the
 * status page — the same treatment a prisma resource gets when its model is
 * missing from the client. Failing at load time beats a 501 on first request.
 */
export const validateCustomRepository = (
  config: Resource,
  repository: CustomRepository | undefined,
): string | undefined => {
  const definition = resolveDefinition(config);
  const enabled = CUSTOM_OPS.filter((op) =>
    isOperationEnabled(definition, op as CrudOperation),
  );

  // A nested resource is only reachable under its parent, so it implements the
  // parent-aware variants instead of the unnested ones.
  const nested = !!config.parent;
  const methodFor = (op: (typeof CUSTOM_OPS)[number]) =>
    nested ? PARENT_METHOD[op] : op;

  if (!repository) {
    if (enabled.length === 0) return undefined;
    return (
      'No repository.ts found. A custom resource implements its own data access; ' +
      `create ${config.name}/repository.ts with a default export implementing: ` +
      `${enabled.map(methodFor).join(', ')}.`
    );
  }

  const implemented = (name: keyof CustomRepository | keyof CustomParentRepository) =>
    typeof (repository as Record<string, unknown>)[name as string] === 'function';

  // `patch` is satisfied by `update` — the adapter falls back, matching the
  // Prisma repository where patch is an update with a partial schema.
  const missing = enabled.filter((op) =>
    op === 'patch'
      ? !implemented(methodFor('patch')) && !implemented(methodFor('update'))
      : !implemented(methodFor(op)),
  );

  if (missing.length) {
    const names = missing.map(methodFor);
    return (
      `repository.ts does not implement ${names.join(', ')}` +
      (nested
        ? ` (this resource is nested under "${config.parent!.route}", so it implements the parent-aware operations)` +
          '. '
        : '. ') +
      'Either implement them or disable the operation in resource.json ' +
      `("operations": { "${missing[0]}": false }).`
    );
  }

  return undefined;
};
