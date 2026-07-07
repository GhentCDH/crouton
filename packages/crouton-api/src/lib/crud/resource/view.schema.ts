import { z } from 'zod';
import { FieldInputSchema } from '@ghentcdh/crouton-core';

export const ViewColumnConfigSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  sortable: z.boolean().optional(),
  searchable: z.boolean().optional(),
  fieldInput: FieldInputSchema.optional(),
});

export type ViewColumnConfig = z.infer<typeof ViewColumnConfigSchema>;

export const ViewConfigSchema = z.object({
  json_schema: z.record(z.string(), z.unknown()),
  ui_schema: z.record(z.string(), z.unknown()),
  columns: z.array(ViewColumnConfigSchema),
  defaultSort: z.string().optional(),
});

export type ViewConfig = z.infer<typeof ViewConfigSchema>;
