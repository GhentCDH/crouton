import type { z } from 'zod';

import type { FormLayoutNode } from '../schema/form-node.schema';
import {
  type LayoutFieldItemSchema,
  type _LayoutFieldControlSchema,
  isComponentItem,
  isNodeItem,
  resolveItemFieldId,
} from '../schema/item.schema';
import type { TableNode } from '../schema/table-node.schema';

type AnyItem = z.infer<typeof LayoutFieldItemSchema> | { component: string };

/**
 * Walk all items in a FormLayoutNode tree, calling `visitor` for each.
 * Recursively descends into nested nodes.
 */
export const walkItems = (node: FormLayoutNode, visitor: (item: AnyItem) => void): void => {
  for (const item of node.items ?? []) {
    if (isNodeItem(item)) {
      walkItems(item as FormLayoutNode, visitor);
    } else {
      visitor(item as AnyItem);
    }
  }
};

/** Collect all field ids from a FormLayoutNode tree (excludes component items). */
export const collectFieldIds = (node: FormLayoutNode): Set<string> => {
  const ids = new Set<string>();
  walkItems(node, (item) => {
    if (!isComponentItem(item)) {
      ids.add(resolveItemFieldId(item as z.infer<typeof LayoutFieldItemSchema>));
    }
  });
  return ids;
};

/** Collect all field ids from a TableNode's items (excludes component items). */
export const collectTableFieldIds = (node: TableNode): Set<string> => {
  const ids = new Set<string>();
  for (const item of node.items ?? []) {
    if (!isComponentItem(item)) {
      ids.add(
        typeof item === 'string'
          ? item
          : (item as z.infer<typeof _LayoutFieldControlSchema>).id,
      );
    }
  }
  return ids;
};
