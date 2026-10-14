import type { z } from 'zod';

import type { LayoutNode } from '../schema/form-node.schema';
import type { TableLayoutRootSchema, TableNode } from '../schema/table-node.schema';

/** Find the `type: "table"` sub-node inside a wrapper layout, or return the node itself. */
export const findTableNode = (node: LayoutNode): LayoutNode =>
  node.type !== 'table' && node.items?.length
    ? (node.items.find(
        (i) =>
          typeof i !== 'string' &&
          !('id' in i) &&
          !('component' in i) &&
          (i as LayoutNode).type === 'table',
      ) as LayoutNode ?? node)
    : node;

/**
 * Depth-first search for the table node in a `TableLayoutRoot`.
 * Returns the node itself if it is a table node (no `type` or `type: "table"`),
 * or the first descendant with `type: "table"`.
 */
export const resolveTableNode = (
  layout: z.infer<typeof TableLayoutRootSchema> | LayoutNode | undefined,
): TableNode | undefined => {
  if (!layout) return undefined;
  const node = layout as Record<string, unknown>;
  if ((!node['type'] || node['type'] === 'table') && !node['component'])
    return layout as TableNode;
  const items = node['items'];
  if (!Array.isArray(items)) return undefined;
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const found = resolveTableNode(item as LayoutNode);
    if (found) return found;
  }
  return undefined;
};

/** True when `layout.table` is a wrapper layout (outer type ≠ "table") with a "table" sub-node. */
export const isTableWrapperLayout = (node: LayoutNode): boolean =>
  node.type !== 'table' &&
  !!node.items?.some(
    (i) =>
      typeof i !== 'string' &&
      !('id' in i) &&
      !('component' in i) &&
      (i as LayoutNode).type === 'table',
  );
