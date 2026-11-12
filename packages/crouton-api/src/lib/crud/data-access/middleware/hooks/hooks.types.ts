import { z } from 'zod';

import type { ListRequest } from '@ghentcdh/crouton-core';

import type { CrudContext, ParentContext } from '../../../context';
import type { DataSourceAdapter } from '../../adapter';

export type { ReadOp, WriteOp } from '../../../context';

export const WriteOpSchema = z.enum(['create', 'update', 'patch', 'delete'] as const);
export const ReadOpSchema = z.enum(['findAll', 'findOne'] as const);

/**
 * The parent a nested read or write is scoped to.
 * Alias of `ParentContext` from the shared context module — kept for backward compatibility.
 */
export type ParentHookContext = ParentContext;

/** Hook context for write operations (`create`, `update`, `patch`, `delete`). */
export interface WriteHookContext<PRISMACLIENT = unknown> extends CrudContext<PRISMACLIENT, 'create' | 'update' | 'patch' | 'delete'> {
  /** The datasource adapter for this resource. Use `dataSource.client` to reach the raw backend. */
  dataSource: DataSourceAdapter;
}

/** Hook context for read operations (`findAll`, `findOne`). */
export interface ReadHookContext<PRISMACLIENT = unknown> extends CrudContext<PRISMACLIENT, 'findAll' | 'findOne'> {
  /** The datasource adapter for this resource. Use `dataSource.client` to reach the raw backend. */
  dataSource: DataSourceAdapter;
  /** The record id for `findOne` reads. Absent on `findAll`. */
  id?: string | number;
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
