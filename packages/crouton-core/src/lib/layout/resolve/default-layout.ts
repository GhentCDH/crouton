import type { JsonColumn } from '../../resource/Column';
import type { FormLayoutNode } from '../schema/form-node.schema';
import type { TableNode } from '../schema/table-node.schema';

/**
 * Synthesise a default FormLayoutNode from column flags.
 * Used when no `layout.form` or `layout.view` is declared.
 * Columns are sorted by `fieldInput.position`, then original array order.
 */
export const defaultFormLayout = (
  columns: JsonColumn[],
  hiddenKey: 'hiddenInForm' | 'hiddenInView',
): FormLayoutNode | undefined => {
  const visible = columns
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => !col[hiddenKey])
    .sort((a, b) => (a.col.fieldInput?.position ?? a.i) - (b.col.fieldInput?.position ?? b.i))
    .map(({ col }) => col.id);
  if (!visible.length) return undefined;
  return { items: visible };
};

/**
 * Synthesise a default TableNode from column flags.
 * Used when no `layout.table` is declared.
 */
export const defaultTableLayout = (columns: JsonColumn[]): TableNode | undefined => {
  const visible = columns
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => !col.hiddenInTable)
    .sort((a, b) => (a.col.fieldInput?.position ?? a.i) - (b.col.fieldInput?.position ?? b.i))
    .map(({ col }) => col.id);
  if (!visible.length) return undefined;
  return { items: visible, rowActions: [], tableActions: [], filterFields: [] };
};

/**
 * Synthesise a default layout for the given context.
 * Returns `undefined` when no visible columns exist.
 */
export const defaultLayoutFor = (
  ctx: 'form' | 'view' | 'table',
  columns: JsonColumn[],
): FormLayoutNode | TableNode | undefined => {
  if (ctx === 'form') return defaultFormLayout(columns, 'hiddenInForm');
  if (ctx === 'view') return defaultFormLayout(columns, 'hiddenInView');
  return defaultTableLayout(columns);
};
