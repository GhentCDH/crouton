import type { JsonColumn } from '../../resource/Column';
import type { FormLayoutNode } from '../../resource/layout/LayoutNode.schema';
import { type TableNode, TableNodeSchema } from '../../resource/layout/TableLayout.schema';
import { sortByPosition } from '../../view/column.utils';

/**
 * Generate a FormLayoutNode from column flags for form/view contexts.
 * This is what the pipeline uses when `layout.<ctx>` is absent.
 */
const defaultFormLayout = (
  columns: JsonColumn[],
  hidden: (c: JsonColumn) => boolean,
): FormLayoutNode | undefined => {
  const visible = sortByPosition(columns.filter((c) => !hidden(c)));
  if (!visible.length) return undefined;
  return { items: visible.map((c) => c.id) };
};

/**
 * Generate a TableNode from column flags for the table context.
 * This is what the pipeline uses when `layout.table` is absent.
 */
const defaultTableLayout = (columns: JsonColumn[]): TableNode | undefined => {
  const visible = sortByPosition(columns.filter((c) => !c.hiddenInTable));
  if (!visible.length) return undefined;
  return TableNodeSchema.parse({ items: visible.map((c) => c.id) });
};

/**
 * Synthesize a layout for the given context from column-level flags.
 * Used by the canvas editor and as the fallback when `layout.<kind>` is absent.
 */
export const defaultLayoutFor = (
  kind: 'form' | 'view' | 'table',
  columns: JsonColumn[],
): FormLayoutNode | TableNode | undefined => {
  if (kind === 'form') return defaultFormLayout(columns, (c) => !!c.hiddenInForm);
  if (kind === 'view') return defaultFormLayout(columns, (c) => !!c.hiddenInView);
  return defaultTableLayout(columns);
};
