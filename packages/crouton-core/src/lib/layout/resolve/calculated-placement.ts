import {
  hasExplicitLayout,
  nodeFieldIdOrder,
  resolveLayoutContext,
} from './context-layout';
import { defaultLayoutFor } from './default-layout';
import type { CalculatedColumn } from '../../resource/CalculatedColumn.schema';
import type { JsonColumn } from '../../resource/Column';
import type { Layout } from '../schema/Layout.schema';

/** Ordered field ids a context renders, used to place calculated columns. */
export type CalculatedPlacement = { order: string[] };

const calcPosition = (c: CalculatedColumn): number =>
  c.fieldInput?.position ?? c.position ?? Infinity;

const visibleByFlag = (c: CalculatedColumn, kind: 'table' | 'view'): boolean =>
  kind === 'table' ? !c.hiddenInTable : !c.hiddenInView;

/**
 * Merge the regular columns' synthesized order with the calculated columns that
 * are visible under their own flags (the no-layout fallback). Calculated columns
 * slot in by `position`, defaulting to the end.
 */
const defaultOrder = (
  regularColumns: JsonColumn[],
  calculated: CalculatedColumn[],
  kind: 'table' | 'view',
): string[] => {
  const regular = nodeFieldIdOrder(
    defaultLayoutFor(kind, regularColumns) as never,
    kind,
  );
  return [
    ...regular.map((id, i) => ({ id, pos: i + 0.5 })),
    ...calculated
      .filter((c) => visibleByFlag(c, kind))
      .map((c) => ({ id: c.id, pos: calcPosition(c) })),
  ]
    .sort((a, b) => a.pos - b.pos)
    .map((entry) => entry.id);
};

/**
 * Resolve where calculated columns may appear in a context.
 *
 * - explicit `layout.<kind>.items` → its order; a calculated column appears only
 *   when its id is listed there.
 * - no layout → the regular columns' flag-synthesized order plus calculated
 *   columns visible under their own `hiddenIn*` flags (the fallback).
 *
 * This is the only place that reads calculated-column visibility flags; the
 * injector is driven purely by the returned order.
 */
export const resolveCalculatedPlacement = (
  layout: Layout | undefined,
  regularColumns: JsonColumn[],
  calculated: CalculatedColumn[],
  kind: 'table' | 'view',
): CalculatedPlacement => {
  if (hasExplicitLayout(layout, kind)) {
    return {
      order: nodeFieldIdOrder(
        resolveLayoutContext(layout, regularColumns, kind),
        kind,
      ),
    };
  }
  return { order: defaultOrder(regularColumns, calculated, kind) };
};
