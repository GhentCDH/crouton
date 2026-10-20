import { resolveTableNode } from './layout-table-order';
import { isComponentItem, isNodeItem, resolveItemFieldId } from './schema';
import type { JsonColumn } from '../resource/Column';
import type { Layout } from './schema/Layout.schema';
import type { FormLayoutNode } from './schema/LayoutNode.schema';
import type { TableNode } from './schema/TableLayout.schema';

const collectFromFormNode = (node: FormLayoutNode, ids: Set<string>): void => {
  for (const item of node.items ?? []) {
    if (isNodeItem(item)) {
      collectFromFormNode(item as FormLayoutNode, ids);
    } else if (!isComponentItem(item)) {
      ids.add(resolveItemFieldId(item as any));
    }
  }
};

const collectFromTableNode = (node: TableNode, ids: Set<string>): void => {
  for (const item of node.items ?? []) {
    if (!isComponentItem(item)) {
      ids.add(typeof item === 'string' ? item : (item as any).id);
    }
  }
};

export const collectLayoutFieldIds = (
  layout: Layout,
  ctx: 'form' | 'view' | 'table',
): Set<string> => {
  const ids = new Set<string>();
  if (ctx === 'form' && layout.form) {
    collectFromFormNode(layout.form, ids);
  } else if (ctx === 'view' && layout.view) {
    collectFromFormNode(layout.view, ids);
  } else if (ctx === 'table' && layout.table) {
    const tableNode = resolveTableNode(layout.table as any);
    if (tableNode) collectFromTableNode(tableNode, ids);
  }
  return ids;
};

/**
 * Override hiddenIn* flags based on the declared layout.
 * When layout.<ctx> exists, a column is visible iff its id is listed there.
 * Contexts without a layout keep the authored column values.
 * P2: listed-but-hidden columns are shown (debug-level info, not a warning).
 */
export const resolveColumnVisibility = (
  columns: JsonColumn[],
  layout: Layout | undefined,
): JsonColumn[] => {
  if (!layout) return columns;

  const formIds = layout.form ? collectLayoutFieldIds(layout, 'form') : null;
  const viewIds = layout.view ? collectLayoutFieldIds(layout, 'view') : null;
  // No items in layout.table → fall through to hiddenInTable flags (searchFields/filterFields only)
  const rawTableIds = layout.table ? collectLayoutFieldIds(layout, 'table') : null;
  const tableIds = rawTableIds?.size ? rawTableIds : null;

  if (!formIds && !viewIds && !tableIds) return columns;

  return columns.map((col) => {
    const patch: Partial<JsonColumn> = {};
    if (formIds !== null) patch.hiddenInForm = !formIds.has(col.id);
    if (viewIds !== null) patch.hiddenInView = !viewIds.has(col.id);
    if (tableIds !== null) patch.hiddenInTable = !tableIds.has(col.id);
    return { ...col, ...patch };
  });
};
