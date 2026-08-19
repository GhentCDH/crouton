import type {
  ParentHookContext,
  ReadOp,
  ResourceHooks,
  WriteOp,
} from './hooks.types';
import type { ValueLabelColumn } from '../resource/valueLabel';
import {
  applyValueLabelColumns,
  normalizeValueLabels,
} from '../resource/valueLabel.apply';

/**
 * Lifecycle-hook application, extracted so every repository implementation
 * treats hooks identically.
 *
 * Before this existed the four wrappers were private methods on
 * `ReadRepository` / `WriteRepository`, which meant an alternative repository
 * (a user-supplied `repository.ts`) would silently skip hooks and the
 * value-label envelope.
 */

export type HookTarget = {
  hooks?: ResourceHooks;
  valueLabelColumns?: ValueLabelColumn[];
};

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
  prisma: any,
  request?: any,
  parent?: ParentHookContext,
): Promise<any[]> => {
  const hook = target.hooks?.afterRead;
  const hooked = hook
    ? await Promise.all(
        rows.map((row) => hook(row, { prisma, op, request, ...(parent && { parent }) })),
      )
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
  prisma: any,
  request?: any,
  parent?: ParentHookContext,
): Promise<any> => {
  const hook = target.hooks?.afterRead;
  return hook
    ? hook(row, { prisma, op, request, ...(parent && { parent }) })
    : row;
};

/** Unwrap value-label envelopes, then run `beforeWrite`. */
export const prepareWrite = async (
  data: any,
  op: WriteOp,
  target: HookTarget,
  prisma: any,
  id?: string | number,
  request?: any,
  parent?: ParentHookContext,
): Promise<any> => {
  const normalized = normalizeValueLabels(data, target.valueLabelColumns);
  const hook = target.hooks?.beforeWrite;
  return hook
    ? hook(normalized, { prisma, op, id, request, ...(parent && { parent }) })
    : normalized;
};

/** Run `afterWrite` on the persisted result. */
export const postWrite = async (
  result: any,
  op: WriteOp,
  target: HookTarget,
  prisma: any,
  id?: string | number,
  request?: any,
  parent?: ParentHookContext,
): Promise<any> => {
  const hook = target.hooks?.afterWrite;
  return hook
    ? hook(result, { prisma, op, id, request, ...(parent && { parent }) })
    : result;
};
