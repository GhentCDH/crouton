import { isComponentItem, isFieldControlItem } from '../schema';
import type { LayoutControl } from '../schema/LayoutItem.schema';

/**
 * The control override carried by a single `layout.<ctx>.items` entry.
 *
 * - a bare string (or a component item) defines no control → the column's own
 *   `fieldInput` (`columns.x.control`) is used;
 * - an object item with `type` and/or `options` supplies the control → that
 *   override wins over the column's control;
 * - an object item without either falls back to the column's control while still
 *   contributing its presentation props (colspan, label, …), handled by callers.
 */
export type ItemControl = {
  /** True when the item names its own control (`type` and/or `options`). */
  hasControl: boolean;
  type?: string;
  options?: Record<string, unknown>;
};

export const resolveItemControl = (item: LayoutControl): ItemControl => {
  if (typeof item === 'string' || isComponentItem(item)) {
    return { hasControl: false };
  }
  if (!isFieldControlItem(item)) return { hasControl: false };
  const { type, options } = item;
  return {
    hasControl: type !== undefined || options !== undefined,
    type,
    options,
  };
};
