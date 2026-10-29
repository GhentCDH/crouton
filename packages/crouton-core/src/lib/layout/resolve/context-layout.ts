import type { z } from 'zod';

import { resolveTableNode } from '../layout-table-order';
import { defaultLayoutFor } from './default-layout';
import type { JsonColumn } from '../../resource/Column';
import { isComponentItem, isNodeItem, resolveItemFieldId } from '../schema';
import type { Layout } from '../schema/Layout.schema';
import type { LayoutFieldItemSchema } from '../schema/LayoutItem.schema';
import type { FormLayoutNode, LayoutNode } from '../schema/LayoutNode.schema';
import type { TableNode } from '../schema/TableLayout.schema';

export type LayoutKind = 'form' | 'view' | 'table';

const collectFromFormNode = (node: FormLayoutNode, ids: string[]): void => {
  for (const item of node.items ?? []) {
    if (isNodeItem(item)) {
      collectFromFormNode(item as FormLayoutNode, ids);
    } else if (!isComponentItem(item)) {
      ids.push(resolveItemFieldId(item as z.infer<typeof LayoutFieldItemSchema>));
    }
  }
};

const collectFromTableNode = (node: TableNode, ids: string[]): void => {
  for (const item of node.items ?? []) {
    if (!isComponentItem(item)) {
      ids.push(typeof item === 'string' ? item : (item as { id: string }).id);
    }
  }
};

/**
 * Field ids referenced by a single layout node, in declaration order.
 * Recurses form/view containers; resolves the inner node of a table wrapper.
 */
export const nodeFieldIdOrder = (
  node: LayoutNode | undefined,
  kind: LayoutKind,
): string[] => {
  if (!node) return [];
  const ids: string[] = [];
  if (kind === 'table') {
    const tableNode = resolveTableNode(node);
    if (tableNode) collectFromTableNode(tableNode, ids);
  } else {
    collectFromFormNode(node as FormLayoutNode, ids);
  }
  return ids;
};

/** Field ids referenced by a layout node as a set. */
export const collectNodeFieldIds = (
  node: LayoutNode | undefined,
  kind: LayoutKind,
): Set<string> => new Set(nodeFieldIdOrder(node, kind));

/** True when `layout.<kind>` exists and references at least one field id. */
export const hasExplicitLayout = (
  layout: Layout | undefined,
  kind: LayoutKind,
): boolean => {
  const explicit = (layout as Record<string, LayoutNode> | undefined)?.[kind];
  return !!explicit && collectNodeFieldIds(explicit, kind).size > 0;
};

/**
 * Resolve the effective layout node for a rendering context.
 *
 * `layout.<kind>` wins when it references at least one field id; otherwise a node
 * is synthesized from the column flags via {@link defaultLayoutFor}. Returns
 * `undefined` when the context produces no fields at all.
 *
 * This is the single place that consults `hiddenInTable/Form/View`: everywhere
 * downstream reads the resolved node's field ids.
 */
export const resolveLayoutContext = (
  layout: Layout | undefined,
  columns: JsonColumn[],
  kind: LayoutKind,
): LayoutNode | undefined => {
  const explicit = (layout as Record<string, LayoutNode> | undefined)?.[kind];
  if (explicit && collectNodeFieldIds(explicit, kind).size) return explicit;
  return defaultLayoutFor(kind, columns) as LayoutNode | undefined;
};
