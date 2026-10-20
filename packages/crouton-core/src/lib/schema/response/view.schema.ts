import { z } from 'zod';

export const ViewSchemaZ = z.object({
  data: z.any(),
  ui: z.any(),
});

export const TableSchema = ViewSchemaZ;

export const FormDevSchemas = z.object({
  table: TableSchema,
  form: ViewSchemaZ.optional(),
  view: ViewSchemaZ.optional(),
});

export type FormDevSchema = z.infer<typeof FormDevSchemas>;

export const Display = z.object({
  mode: z.enum(['page', 'modal']),
  customComponent: z.string().nullish(),
});
