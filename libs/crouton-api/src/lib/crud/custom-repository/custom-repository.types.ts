import { z } from 'zod';

import type { ListRequest } from '@ghentcdh/crouton-core';

import type { CrudContext, DataSourceResolver } from '../context';
import type { Resource } from '../resource/ResourceConfig.schema';

/**
 * Contract for a `kind: "custom"` resource's `repository.ts`.
 *
 * The file default-exports an object implementing whichever operations the
 * resource enables. Discovery is by convention, like `hooks.ts` — see
 * `custom-repository.loader`.
 *
 * Hand-written interfaces, deliberately not `z.infer` of a Zod object:
 * `ResourceHooks` takes that shortcut and its `PRISMACLIENT` generic is erased
 * by the inference, so `ctx.prisma` is always `any` in a hook file. Here the
 * generics survive, and `CustomRepository<Row, PrismaClient>` gives a typed
 * `ctx.prisma`.
 */

/** Operations a custom repository can implement. */
export type CustomOp =
  | 'findAll'
  | 'findOne'
  | 'create'
  | 'update'
  | 'patch'
  | 'delete';

/**
 * Context passed to every method of a custom `repository.ts`.
 *
 * Extends the shared `CrudContext` base, narrowing `config` and `dataSources` to
 * required and adding `offset` for offset-paginated backends.
 */
export interface CustomRepositoryContext<PRISMA = unknown> extends CrudContext<PRISMA> {
  /** The fully resolved resource config, including columns and views. */
  config: Resource;
  /** Which operation is executing. */
  op: CustomOp;
  /** All datasource adapters registered for this project. */
  dataSources: DataSourceResolver;
  /**
   * Zero-based row offset derived from `page`/`pageSize`, for backends that
   * paginate by offset rather than page number.
   */
  offset: number;
  /**
   * The incoming HTTP request, when the controller layer supplies one.
   * Same value hooks receive as `ctx.request` — use it for auth/tenant context.
   * Cast to `CroutonRequest` (from `@ghentcdh/crouton-api`) for typed access.
   */
  request?: unknown;
  /** Free-text search string from `?q=`. Use with `search` paths to implement custom search. */
  q?: string;
  /** Resolved dot-paths that `?q=` should match against (from `operations.findAll.search`). */
  search?: string[];
  /** Field allowlist for `?filter=`; absent means any column is accepted. */
  filterAllowlist?: string[];
}

/** Rows plus the total matching count, used to build the list envelope. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-facing interface: default `any` allows untyped implementations
export interface CustomListResult<T = any> {
  data: T[];
  count: number;
}

/**
 * Operations for a resource that declares a `parent`.
 *
 * A nested resource is *only* reachable under its parent, so these replace the
 * unnested operations rather than supplementing them — the parent id is always
 * available, and a query can never accidentally run across every parent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-facing interface: default `any` allows untyped implementations
export interface CustomParentRepository<T = any, PRISMA = unknown> {
  /** List the children of one parent. Returns rows *and* the total count. */
  findAllByParent?(
    parentId: string | number,
    params: ListRequest,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<CustomListResult<T>>;
  /** Fetch one child of one parent. Return `null`/`undefined` for a 404. */
  findOneByParent?(
    parentId: string | number,
    id: string | number,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T | null | undefined>;
  createByParent?(
    parentId: string | number,
    data: unknown,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
  updateByParent?(
    parentId: string | number,
    id: string | number,
    data: unknown,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
  /** Falls back to `updateByParent` when not implemented. */
  patchByParent?(
    parentId: string | number,
    id: string | number,
    data: unknown,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
  deleteByParent?(
    parentId: string | number,
    id: string | number,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-facing interface: default `any` allows untyped implementations
export interface CustomRepository<T = any, PRISMA = unknown>
  extends CustomParentRepository<T, PRISMA> {
  /**
   * List rows. Must return the total `count` as well — the framework builds the
   * `{ data, request: { count, totalPages, ... } }` envelope from it.
   *
   * `params.filter` holds raw `field:value:operator` strings; `parseFilterString`
   * is exported from crouton-api if you want to reuse the grammar.
   */
  findAll?(
    params: ListRequest,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<CustomListResult<T>>;
  /** Fetch one row. Return `null`/`undefined` to produce a 404. */
  findOne?(
    id: string | number,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T | null | undefined>;
  create?(data: unknown, ctx: CustomRepositoryContext<PRISMA>): Promise<T>;
  update?(
    id: string | number,
    data: unknown,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
  /**
   * Partial update. Falls back to `update` when not implemented, matching the
   * Prisma repository where `patch` is `update` with a partial schema.
   */
  patch?(
    id: string | number,
    data: unknown,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
  delete?(
    id: string | number,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
}

/** Every operation a custom repository may implement, in registration order. */
export const CUSTOM_OPS: readonly CustomOp[] = [
  'findAll',
  'findOne',
  'create',
  'update',
  'patch',
  'delete',
] as const;

/** Parent-aware method name for an operation, used by a nested resource. */
export const PARENT_METHOD: Record<CustomOp, keyof CustomParentRepository> = {
  findAll: 'findAllByParent',
  findOne: 'findOneByParent',
  create: 'createByParent',
  update: 'updateByParent',
  patch: 'patchByParent',
  delete: 'deleteByParent',
} as const;

/**
 * Loose schema for embedding the loaded repository on `ResourceSchema`.
 *
 * `z.custom` holds the functions without Zod trying to describe them, the same
 * trick `ResourceHooksSchema` uses. The *public* type above is what consumers
 * annotate their file with.
 */
export const CustomRepositorySchema = z.custom<CustomRepository>(
  (value) => typeof value === 'object' && value !== null,
);
