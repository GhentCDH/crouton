import { z } from 'zod';

import type { ListRequest } from '@ghentcdh/crouton-core';

import type { DataSourceAdapter } from '../../adapter';

export const WriteOpSchema = z.enum(['create', 'update', 'patch', 'delete']);
export type WriteOp = z.infer<typeof WriteOpSchema>;

export const ReadOpSchema = z.enum(['findAll', 'findOne']);
export type ReadOp = z.infer<typeof ReadOpSchema>;

/**
 * The parent a nested read or write is scoped to.
 *
 * Present whenever the resource is reached under a parent — as a sub-resource
 * declared by a relation column on the parent (`param` is the parent's own `id`),
 * or as a resource that declares `parent` and mounts its own controller beneath
 * it (`param` is the name it chose, e.g. `groupId`). Absent on a top-level write.
 *
 * Deliberately the same shape as `CustomRepositoryContext.parent`, so a hook and a
 * `repository.ts` read the parent identically.
 */
export interface ParentHookContext {
  route: string;
  param: string;
  id: string | number;
}

export interface WriteHookContext<PRISMACLIENT = unknown> {
  /** The datasource adapter for this resource. Use `dataSource.client` to reach the raw backend. */
  dataSource: DataSourceAdapter;
  /**
   * Raw Prisma client — backward-compatible alias for `dataSource.client`.
   * `undefined` on a non-Prisma datasource.
   * @deprecated prefer `dataSource.client`
   */
  prisma: PRISMACLIENT;
  op: WriteOp;
  id?: string | number;
  request?: unknown;
  parent?: ParentHookContext;
}

export interface ReadHookContext<PRISMACLIENT = unknown> {
  /** The datasource adapter for this resource. Use `dataSource.client` to reach the raw backend. */
  dataSource: DataSourceAdapter;
  /**
   * Raw Prisma client — backward-compatible alias for `dataSource.client`.
   * `undefined` on a non-Prisma datasource.
   * @deprecated prefer `dataSource.client`
   */
  prisma: PRISMACLIENT;
  op: ReadOp;
  /** The record id for `findOne` reads. Absent on `findAll`. */
  id?: string | number;
  request?: unknown;
  parent?: ParentHookContext;
}

export const ResourceHooksSchema = z.object({
  beforeWrite: z
    .custom<(data: unknown, ctx: WriteHookContext) => Promise<unknown> | unknown>()
    .optional(),
  afterWrite: z
    .custom<(result: unknown, ctx: WriteHookContext) => Promise<unknown> | unknown>()
    .optional(),
  afterRead: z
    .custom<(row: unknown, ctx: ReadHookContext) => Promise<unknown> | unknown>()
    .optional(),
  beforeFindAll: z
    .custom<
      (
        params: ListRequest,
        ctx: ReadHookContext,
      ) => Promise<ListRequest> | ListRequest
    >()
    .optional(),
  afterFindAll: z
    .custom<
      (rows: unknown[], ctx: ReadHookContext) => Promise<unknown[]> | unknown[]
    >()
    .optional(),
});

/**
 * Hand-written interface so the `PRISMACLIENT` generic is preserved.
 * `z.infer<typeof ResourceHooksSchema>` erases it (Zod wraps every custom()
 * in `ZodType<T>`, discarding the generic), making `ctx.prisma` always `any`.
 */
export interface ResourceHooks<PRISMACLIENT = unknown> {
  beforeWrite?: (data: unknown, ctx: WriteHookContext<PRISMACLIENT>) => Promise<unknown> | unknown;
  afterWrite?: (result: unknown, ctx: WriteHookContext<PRISMACLIENT>) => Promise<unknown> | unknown;
  afterRead?: (row: unknown, ctx: ReadHookContext<PRISMACLIENT>) => Promise<unknown> | unknown;
  beforeFindAll?: (params: ListRequest, ctx: ReadHookContext<PRISMACLIENT>) => Promise<ListRequest> | ListRequest;
  afterFindAll?: (rows: unknown[], ctx: ReadHookContext<PRISMACLIENT>) => Promise<unknown[]> | unknown[];
}
