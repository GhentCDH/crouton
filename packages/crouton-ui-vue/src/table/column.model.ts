type TextCellType = any;
export type ColumnDef = TextCellType & {
  id: string;
  label: string;
  width?: string;
  actions: any;
};
