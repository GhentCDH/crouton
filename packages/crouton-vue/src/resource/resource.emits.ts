export type RecordData = { id?: string; [key: string]: any };

export const ResourceEmits = {
  'view:record': (_data: RecordData) => true,
  'edit:record': (_data: RecordData) => true,
} as const;
