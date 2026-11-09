import type { ListRequest } from '@ghentcdh/crouton-core';
import { offsetOf } from '@ghentcdh/crouton-core';

import type { CustomRepositoryContext } from '../custom-repository/custom-repository.types';
import type { DataSourceAdapter } from '../data-access/adapter';
import type { Resource } from '../resource/ResourceConfig.schema';
import type { CrudContext, CrudOp, DataSourceResolver, ParentContext } from './context.types';

/**
 * Build a `CrudContext` from an adapter and optional overrides.
 *
 * Used by `hookCtxRead`/`hookCtxWrite` in `hooks.apply.ts` and by the
 * custom-repository adapter, so both sides produce structurally identical base contexts.
 */
export const buildCrudContext = <P = unknown, OP extends CrudOp = CrudOp>(
  op: OP,
  adapter: DataSourceAdapter,
  options?: {
    prisma?: P;
    request?: unknown;
    id?: string | number;
    parent?: ParentContext;
    config?: Resource;
    dataSources?: DataSourceResolver;
  },
): CrudContext<P, OP> & { dataSource: DataSourceAdapter } => ({
  op,
  prisma: (options?.prisma ?? adapter.client) as P,
  dataSource: adapter,
  ...(options?.id !== undefined && { id: options.id }),
  ...(options?.request !== undefined && { request: options.request }),
  ...(options?.parent && { parent: options.parent }),
  ...(options?.config && { config: options.config }),
  ...(options?.dataSources && { dataSources: options.dataSources }),
});

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
