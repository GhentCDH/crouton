import type { JsonColumn } from '../../resource/Column';
import type { LayoutControl, WhenCondition } from '../schema/LayoutItem.schema';
import { isComponentItem } from '../schema/LayoutItem.schema';

export type ResolvedFieldControl = {
  label?: string;
  hideLabel?: boolean;
  type?: string;
  options?: Record<string, unknown>;
  colspan?: number;
  rowspan?: number;
  width?: string;
  showWhen?: WhenCondition;
  hideWhen?: WhenCondition;
  disabledWhen?: WhenCondition;
};

const fieldOpt = (col: JsonColumn, key: string): unknown =>
  (col.fieldInput?.options as Record<string, unknown> | undefined)?.[key];

/**
 * Resolve effective field control overrides for a layout item.
 * Precedence: item fields > column fieldInput.options > column defaults.
 * Returns {} for bare string items and component items (no overrides).
 */
export const resolveFieldControl = (
  col: JsonColumn,
  item: LayoutControl,
): ResolvedFieldControl => {
  if (typeof item === 'string' || isComponentItem(item)) return {};

  return {
    label: item.label ?? (fieldOpt(col, 'label') as string | undefined),
    hideLabel: item.hideLabel ?? (fieldOpt(col, 'hideLabel') as boolean | undefined),
    type: item.type,
    options: item.options,
    colspan: item.colspan ?? (fieldOpt(col, 'colspan') as number | undefined),
    rowspan: item.rowspan ?? (fieldOpt(col, 'rowspan') as number | undefined),
    width: item.width ?? (fieldOpt(col, 'width') as string | undefined),
    showWhen: item.showWhen,
    hideWhen: item.hideWhen,
    disabledWhen: item.disabledWhen,
  };
};
