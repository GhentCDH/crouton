import { z } from 'zod';

import type { ListRequest } from '@ghentcdh/crouton-core';

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

export interface CustomRepositoryContext<PRISMA = any> {
  /**
   * Resolved datasource client for this resource — the one named by the
   * resource's `database`, or the project default.
   *
   * `undefined` when the project has no datasources at all, which is a valid
   * setup for a backend whose resources are all custom.
   */
  prisma: PRISMA;
  /** Escape hatch for a resource that reads from more than one database. */
  dataSources: {
    resolve(name?: string): any;
    entries(): { name: string; client: any }[];
  };
  /** The fully resolved resource config, including columns and views. */
  config: Resource;
  /** Which operation is executing. */
  op: CustomOp;
  /**
   * Zero-based row offset derived from `page`/`pageSize`, for backends that
   * paginate by offset rather than page number.
   */
  offset: number;
  /** Record id, on the operations that address one. */
  id?: string | number;
  /**
   * The incoming HTTP request, when the controller layer supplies one.
   * Same value hooks receive as `ctx.request` — use it for auth/tenant context.
   */
  request?: any;
}

/** Rows plus the total matching count, used to build the list envelope. */
export interface CustomListResult<T = any> {
  data: T[];
  count: number;
}

export interface CustomRepository<T = any, PRISMA = any> {
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
  create?(data: any, ctx: CustomRepositoryContext<PRISMA>): Promise<T>;
  update?(
    id: string | number,
    data: any,
    ctx: CustomRepositoryContext<PRISMA>,
  ): Promise<T>;
  /**
   * Partial update. Falls back to `update` when not implemented, matching the
   * Prisma repository where `patch` is `update` with a partial schema.
   */
  patch?(
    id: string | number,
    data: any,
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
