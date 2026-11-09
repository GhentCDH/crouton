/**
 * Runtime tuning options for a table column. Only the keys actually used by
 * the table renderers are typed; unknown keys are still allowed at runtime
 * because columns are plain objects built by the table builders.
 */
export type ColumnOptions = {
  format?: string;
  key?: string;
  sortable?: boolean;
  sortId?: string;
  /** Sticky pinned column rendering */
  pin?: 'left' | 'right';
  /** Horizontal text alignment for cells */
  align?: string;
  headerTooltip?: string;
  /** truncate long values (true → ellipsis, number → line clamp) */
  truncate?: boolean | number;
  /** Inherited column visibility — hidden when false */
  visible?: boolean;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
};

export type ColumnDef = {
  id: string;
  label: string;
  /** Cell type, e.g. 'TextCell' */
  type?: string;
  /** JSON-schema scope, e.g. '#/properties/name' */
  scope?: string;
  width?: string;
  actions?: unknown;
  options?: ColumnOptions;
};
