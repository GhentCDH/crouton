import { z } from 'zod';

import { FieldInputSchema } from '../../resource/FieldInput.schema';

export const ViewColumnConfigSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  /** i18n key for the column header label. Frontend: `translator(labelKey, label)`. Auto-populated from columnKey(resourceName, id); override via JsonColumn.labelKey for per-context differences. */
  labelKey: z.string().optional(),
  sortable: z.boolean().optional(),
  searchable: z.boolean().optional(),
  fieldInput: FieldInputSchema.optional(),
  // When set, the frontend translates cell values via enumKey(enumName, value).
  enumName: z.string().optional(),
});

export type ViewColumnConfig = z.infer<typeof ViewColumnConfigSchema>;

export const ViewConfigSchema = z.object({
  /** JSON schema for this view. */
  data: z.record(z.string(), z.unknown()).optional(),
  /** UI schema for this view. */
  ui: z.record(z.string(), z.unknown()).optional(),
  columns: z.array(ViewColumnConfigSchema),
  defaultSort: z.string().optional(),
  defaultSortDir: z.enum(['asc', 'desc']).optional(),
});

export type ViewConfig = z.infer<typeof ViewConfigSchema>;

const viewDefList = ['table', 'view', 'form'] as const;
export const ViewDefEnum = z.enum(viewDefList);
export type ViewDef = (typeof viewDefList)[number];
