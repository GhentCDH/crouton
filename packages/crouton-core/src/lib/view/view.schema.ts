import { z } from 'zod';

import { FieldInputSchema } from '../resource/FieldInput.schema';

export const ViewColumnConfigSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  sortable: z.boolean().optional(),
  searchable: z.boolean().optional(),
  fieldInput: FieldInputSchema.optional(),
});

export type ViewColumnConfig = z.infer<typeof ViewColumnConfigSchema>;

export const ViewConfigSchema = z.object({
  // TODO why we have both?
  json_schema: z.record(z.string(), z.unknown()).optional(),
  ui_schema: z.record(z.string(), z.unknown()).optional(),
  // TODO why we have both?
  ui: z.record(z.string(), z.unknown()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  columns: z.array(ViewColumnConfigSchema),
  defaultSort: z.string().optional(),
});

export type ViewConfig = z.infer<typeof ViewConfigSchema>;

const viewDefList = ['table', 'view', 'form'] as const;
export const ViewDefEnum = z.enum(viewDefList);
export type ViewDef = (typeof viewDefList)[number];
