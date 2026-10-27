import type { z } from 'zod';

import type { JsonColumn } from '../../resource/Column';
import { isComponentItem, isNodeItem, resolveItemFieldId } from '../schema/LayoutItem.schema';
import type { LayoutFieldItemSchema } from '../schema/LayoutItem.schema';
import type { FormLayoutNode } from '../schema/LayoutNode.schema';

export type LayoutValidationResult = {
  errors: string[];
  warnings: string[];
};

const collectFieldIds = (node: FormLayoutNode): string[] => {
  const ids: string[] = [];
  for (const item of node.items ?? []) {
    if (isNodeItem(item)) {
      ids.push(...collectFieldIds(item as FormLayoutNode));
    } else if (!isComponentItem(item)) {
      ids.push(resolveItemFieldId(item as z.infer<typeof LayoutFieldItemSchema>));
    }
  }
  return ids;
};

/**
 * Validate a form/view layout node against the known column set.
 * - Unknown column ids → error
 * - Duplicate column ids → error
 * - Required columns absent from layout.form → warning (P4)
 */
export const validateLayout = (
  node: FormLayoutNode,
  columns: JsonColumn[],
  ctx: 'form' | 'view',
): LayoutValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const knownIds = new Set(columns.map((c) => c.id));
  const seen = new Set<string>();

  for (const id of collectFieldIds(node)) {
    if (!knownIds.has(id)) {
      errors.push(`layout.${ctx}: unknown column id "${id}"`);
    } else if (seen.has(id)) {
      errors.push(`layout.${ctx}: duplicate column id "${id}"`);
    }
    seen.add(id);
  }

  if (ctx === 'form') {
    for (const col of columns) {
      if (col.required && !col.idField && !seen.has(col.id)) {
        warnings.push(
          `layout.form: required column "${col.id}" not in layout.form; create will fail`,
        );
      }
    }
  }

  return { errors, warnings };
};
