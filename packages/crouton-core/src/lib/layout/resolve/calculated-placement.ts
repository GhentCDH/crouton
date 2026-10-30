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

/** Position slot for a computed column: fieldInput wins over the column position. */
const calcPosition = (c: { fieldInput?: { position?: number } | null; position?: number }): number =>
  c.fieldInput?.position ?? c.position ?? Infinity;

const visibleByFlag = (c: JsonColumn, kind: 'table' | 'view'): boolean =>
  kind === 'table' ? !c.hiddenInTable : !c.hiddenInView;

/**
 * Merge the regular columns' synthesized order with the computed columns that
 * are visible under their own column flags (the no-layout fallback), and with
 * the deprecated top-level `calculatedColumns` entries that are not shadowed by
 * a same-id computed column (those are always visible — the legacy array has no
 * visibility control anymore). Computed columns slot in by `position`.
 */
const defaultOrder = (
  columns: JsonColumn[],
  calculated: CalculatedColumn[],
  kind: 'table' | 'view',
): string[] => {
  const regularColumns = columns.filter((c) => !c.computed);
  const regular = nodeFieldIdOrder(
    defaultLayoutFor(kind, regularColumns) as never,
    kind,
  );

  const computedIds = new Set(
    columns.filter((c) => c.computed).map((c) => c.id),
  );
  const computed = columns
    .filter((c) => c.computed && visibleByFlag(c, kind))
    .map((c) => ({ id: c.id, pos: calcPosition(c) }));
  const legacy = calculated
    .filter((c) => !computedIds.has(c.id))
    .map((c) => ({ id: c.id, pos: calcPosition(c) }));

  return [
    ...regular.map((id, i) => ({ id, pos: i + 0.5 })),
    ...computed,
    ...legacy,
  ]
    .sort((a, b) => a.pos - b.pos)
    .map((entry) => entry.id);
};

/**
 * Resolve where calculated columns may appear in a context.
 *
 * - explicit `layout.<kind>.items` → its order; a calculated column appears only
 *   when its id is listed there.
 * - no layout → the regular columns' flag-synthesized order plus computed
 *   columns visible under their own column `hiddenIn*` flags (the fallback).
 *
 * `columns` holds all enriched columns including the computed ones; `calculated`
 * is the merged list consumed by the injector (entries shadowed by a computed
 * column are resolved via that column's flags). The injector itself is driven
 * purely by the returned order and never reads visibility flags.
 */
export const resolveCalculatedPlacement = (
  layout: Layout | undefined,
  columns: JsonColumn[],
  calculated: CalculatedColumn[],
  kind: 'table' | 'view',
): CalculatedPlacement => {
  if (hasExplicitLayout(layout, kind)) {
    return {
      order: nodeFieldIdOrder(
        resolveLayoutContext(layout, columns.filter((c) => !c.computed), kind),
        kind,
      ),
    };
  }
  return { order: defaultOrder(columns, calculated, kind) };
};
