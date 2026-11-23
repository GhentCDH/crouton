import type { IconEnum } from '../icons';
import type { ColumnDef } from './column.model';

export type TableAction = {
  label?: string;
  tooltip?: string;
  icon?: IconEnum;
  action: <T>(data: T) => void;
  /** Optional predicate — when provided, the button is only shown if this returns true for the row. */
  visible?: <T>(data: T) => boolean;
  /** Optional predicate — when provided and returns true for the row, the button shows a loading spinner. */
  loading?: <T>(data: T) => boolean;
  /** Marks the built-in view/edit action, so `rowClick: "view" | "edit"` can run it. */
  kind?: 'view' | 'edit';
};

export type DisplayColumn = ColumnDef & { component?: object };
