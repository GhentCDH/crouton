import type { ColumnDef } from './column.model';
import type { IconEnum } from '../icons';

export type TableAction = {
  label?: string;
  tooltip?: string;
  icon?: IconEnum;
  action: <T>(data: T) => void;
  /** Optional predicate — when provided, the button is only shown if this returns true for the row. */
  visible?: <T>(data: T) => boolean;
};

export type DisplayColumn = ColumnDef & { component: any };
