import { z } from 'zod';

import type { DataSourceAdapter } from '../data-source/data-source.adapter';

export const WriteOpSchema = z.enum(['create', 'update', 'patch', 'upsert', 'delete']);
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
  request?: any;
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
  request?: any;
  parent?: ParentHookContext;
}

export const ResourceHooksSchema = z.object({
  beforeWrite: z
    .custom<(data: any, ctx: WriteHookContext<any>) => Promise<any> | any>()
    .optional(),
  afterWrite: z
    .custom<(result: any, ctx: WriteHookContext<any>) => Promise<any> | any>()
    .optional(),
  afterRead: z
    .custom<(row: any, ctx: ReadHookContext<any>) => Promise<any> | any>()
    .optional(),
});

/**
 * Hand-written interface so the `PRISMACLIENT` generic is preserved.
 * `z.infer<typeof ResourceHooksSchema>` erases it (Zod wraps every custom()
 * in `ZodType<T>`, discarding the generic), making `ctx.prisma` always `any`.
 */
export interface ResourceHooks<PRISMACLIENT = any> {
  beforeWrite?: (data: any, ctx: WriteHookContext<PRISMACLIENT>) => Promise<any> | any;
  afterWrite?: (result: any, ctx: WriteHookContext<PRISMACLIENT>) => Promise<any> | any;
  afterRead?: (row: any, ctx: ReadHookContext<PRISMACLIENT>) => Promise<any> | any;
}
