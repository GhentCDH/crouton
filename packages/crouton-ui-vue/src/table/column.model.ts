export type ColumnDef = {
  id: string;
  label: string;
  width?: string;
  actions: unknown;
  [key: string]: unknown;
};
