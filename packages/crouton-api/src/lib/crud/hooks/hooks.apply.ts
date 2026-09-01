import type {
  ParentHookContext,
  ReadOp,
  ResourceHooks,
  WriteOp,
} from './hooks.types';
import type { DataSourceAdapter } from '../data-source/data-source.adapter';
import type { ValueLabelColumn } from '../resource/valueLabel';
import {
  applyValueLabelColumns,
  normalizeValueLabels,
} from '../resource/valueLabel.apply';

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

const hookCtxRead = (adapter: DataSourceAdapter, op: ReadOp, request?: any, parent?: ParentHookContext) => ({
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
  request?: any,
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
  rows: any[],
  op: ReadOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  request?: any,
  parent?: ParentHookContext,
): Promise<any[]> => {
  const hook = target.hooks?.afterRead;
  const ctx = hookCtxRead(adapter, op, request, parent);
  const hooked = hook
    ? await Promise.all(rows.map((row) => hook(row, ctx)))
    : rows;
  const cols = target.valueLabelColumns;
  return cols?.length
    ? hooked.map((r) => applyValueLabelColumns(r, cols))
    : hooked;
};

/** `afterRead` for a single row. Deliberately no value-label envelope. */
export const decorateRow = async (
  row: any,
  op: ReadOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  request?: any,
  parent?: ParentHookContext,
): Promise<any> => {
  const hook = target.hooks?.afterRead;
  return hook ? hook(row, hookCtxRead(adapter, op, request, parent)) : row;
};

/** Unwrap value-label envelopes, then run `beforeWrite`. */
export const prepareWrite = async (
  data: any,
  op: WriteOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  id?: string | number,
  request?: any,
  parent?: ParentHookContext,
): Promise<any> => {
  const normalized = normalizeValueLabels(data, target.valueLabelColumns);
  const hook = target.hooks?.beforeWrite;
  return hook
    ? hook(normalized, hookCtxWrite(adapter, op, id, request, parent))
    : normalized;
};

/** Run `afterWrite` on the persisted result. */
export const postWrite = async (
  result: any,
  op: WriteOp,
  target: HookTarget,
  adapter: DataSourceAdapter,
  id?: string | number,
  request?: any,
  parent?: ParentHookContext,
): Promise<any> => {
  const hook = target.hooks?.afterWrite;
  return hook ? hook(result, hookCtxWrite(adapter, op, id, request, parent)) : result;
};
