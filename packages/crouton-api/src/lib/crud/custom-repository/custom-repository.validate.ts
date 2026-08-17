import { CUSTOM_OPS, type CustomRepository } from './custom-repository.types';
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

  if (!repository) {
    return (
      'No repository.ts found. A custom resource implements its own data access; ' +
      `create ${config.name}/repository.ts with a default export implementing: ` +
      `${enabled.join(', ') || 'no operations'}.`
    );
  }

  // `patch` is satisfied by `update` — the adapter falls back, matching the
  // Prisma repository where patch is an update with a partial schema.
  const missing = enabled.filter((op) =>
    op === 'patch'
      ? typeof repository.patch !== 'function' &&
        typeof repository.update !== 'function'
      : typeof repository[op] !== 'function',
  );

  if (missing.length) {
    return (
      `repository.ts does not implement ${missing.join(', ')}. ` +
      'Either implement them or disable the operation in resource.json ' +
      `("operations": { "${missing[0]}": false }).`
    );
  }

  return undefined;
};
