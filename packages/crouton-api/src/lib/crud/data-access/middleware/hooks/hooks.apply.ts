import type { ListRequest, Row, ValueLabelColumn  } from '@ghentcdh/crouton-core';

import type {
  ParentHookContext,
  ReadOp,
  ResourceHooks,
  WriteOp,
} from './hooks.types';
import type { DataSourceAdapter } from '../../adapter';
import {
  applyValueLabelColumns,
  normalizeValueLabels,
} from '../value-label.apply';

/**
 * Lifecycle-hook application, extracted so every repository implementation
 * treats hooks identically.
 *
 * All four helpers now accept a `DataSourceAdapter` instead of a raw Prisma
 * client. The adapter is forwarded into the hook context as `dataSource`; the
 * raw client is available as `ctx.prisma` (= `adapter.client`) for backward
 * compatibility with existing hook files.
 */

export type HookTarget = {
  hooks?: ResourceHooks;
  valueLabelColumns?: ValueLabelColumn[];
};

const hookCtxRead = (adapter: DataSourceAdapter, op: ReadOp, request?: unknown, parent?: ParentHookContext) => ({
  dataSource: adapter,
  prisma: adapter.client,
  op,
  request,
  ...(parent && { parent }),
});

const hookCtxWrite = (
  adapter: DataSourceAdapter,
  op: WriteOp,
  id?: string | number,
  request?: unknown,
  parent?: ParentHookContext,
) => ({
  dataSource: adapter,
  prisma: adapter.client,
  op,
  ...(id !== undefined && { id }),
  ...(request !== undefined && { request }),
  ...(parent && { parent }),
});

/**
 * `afterRead` for a list, plus the `{ value, label }` envelope.
 *
 * The envelope is applied on list reads only — `findOne` feeds the form/detail
 * view, where the select control maps the stored scalar to its label itself and
 * submits the scalar back.
 */
export const decorateRows = async (
  rows: unknown[],
  op: ReadOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  request?: unknown,
  parent?: ParentHookContext,
): Promise<unknown[]> => {
  const hook = target.hooks?.afterRead;
  const ctx = hookCtxRead(adapter, op, request, parent);
  const hooked = hook
    ? await Promise.all(rows.map((row) => hook(row, ctx)))
    : rows;
  const cols = target.valueLabelColumns;
  return cols?.length
    ? hooked.map((r) => applyValueLabelColumns(r as Row, cols))
    : hooked;
};

/** `afterRead` for a single row. Deliberately no value-label envelope. */
export const decorateRow = async (
  row: unknown,
  op: ReadOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  request?: unknown,
  parent?: ParentHookContext,
): Promise<unknown> => {
  const hook = target.hooks?.afterRead;
  return hook ? hook(row, hookCtxRead(adapter, op, request, parent)) : row;
};

/** Unwrap value-label envelopes, then run `beforeWrite`. */
export const prepareWrite = async (
  data: unknown,
  op: WriteOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  id?: string | number,
  request?: unknown,
  parent?: ParentHookContext,
): Promise<unknown> => {
  const normalized = normalizeValueLabels(data, target.valueLabelColumns);
  const hook = target.hooks?.beforeWrite;
  return hook
    ? hook(normalized, hookCtxWrite(adapter, op, id, request, parent))
    : normalized;
};

/** Run `beforeFindAll` to transform query params before the DB query. */
export const applyBeforeFindAll = async (
  params: ListRequest,
  target: HookTarget,
  adapter: DataSourceAdapter,
  request?: unknown,
  parent?: ParentHookContext,
): Promise<ListRequest> => {
  const hook = target.hooks?.beforeFindAll;
  return hook
    ? hook(params, hookCtxRead(adapter, 'findAll', request, parent))
    : params;
};

/** Run `afterFindAll` on the full result list, after per-row `afterRead` decoration. */
export const applyAfterFindAll = async (
  rows: unknown[],
  target: HookTarget,
  adapter: DataSourceAdapter,
  request?: unknown,
  parent?: ParentHookContext,
): Promise<unknown[]> => {
  const hook = target.hooks?.afterFindAll;
  return hook
    ? hook(rows, hookCtxRead(adapter, 'findAll', request, parent))
    : rows;
};

/** Run `afterWrite` on the persisted result. */
export const postWrite = async (
  result: unknown,
  op: WriteOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  id?: string | number,
  request?: unknown,
  parent?: ParentHookContext,
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- afterWrite hook is user-provided and returns any
): Promise<any> => {
  const hook = target.hooks?.afterWrite;
  return hook
    ? hook(result, hookCtxWrite(adapter, op, id, request, parent))
    : result;
};
