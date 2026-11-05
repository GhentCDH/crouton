import type { ListRequest } from '@ghentcdh/crouton-core';
import { offsetOf } from '@ghentcdh/crouton-core';

import type { CrudContext, CrudOp, DataSourceResolver } from './context.types';
import type { CustomRepositoryContext } from '../custom-repository/custom-repository.types';
import type { Resource } from '../resource/ResourceConfig.schema';

/**
 * Derive a `CustomRepositoryContext` from any `CrudContext` that already carries
 * `config` and `dataSources`.
 *
 * Use in a hook when you need to call a method on `repository.ts` directly:
 *
 * ```ts
 * import repo from './repository';
 * export default {
 *   afterWrite: async (result, ctx) => {
 *     const fresh = await repo.findOne!(result.id, toRepositoryContext(ctx, { op: 'findOne' }));
 *     return fresh ?? result;
 *   },
 * } satisfies ResourceHooks<PrismaClient>;
 * ```
 */
export const toRepositoryContext = <P>(
  ctx: CrudContext<P> & { config: Resource; dataSources: DataSourceResolver },
  overrides: { op?: CrudOp; params?: ListRequest; id?: string | number } = {},
): CustomRepositoryContext<P> => ({
  ...ctx,
  op: overrides.op ?? ctx.op,
  offset: overrides.params ? offsetOf(overrides.params) : 0,
  ...(overrides.id !== undefined && { id: overrides.id }),
});
