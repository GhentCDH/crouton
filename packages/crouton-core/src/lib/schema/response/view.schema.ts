import { z } from 'zod';

const ViewSchemaZ = z.object({
  data: z.any(),
  ui: z.any(),
  columns: z.array(z.any()).optional(),
});

export const TableSchema = ViewSchemaZ;

export const FormDevSchemas = z.object({
  table: TableSchema,
  form: ViewSchemaZ.optional(),
  view: ViewSchemaZ.optional(),
});

export type FormDevSchema = z.infer<typeof FormDevSchemas>;

export const DisplayMode = z.enum(['page', 'modal']);

/**
 * How a record opens, per context. `form` drives create/edit, `view` drives the
 * read-only detail. They mirror `layout.form.container` / `layout.view.container`
 * and are independent, so one can be a `page` while the other is a `modal`.
 */
export const Display = z.object({
  form: z
    .object({
      mode: DisplayMode,
    })
    .optional(),
  view: z
    .object({
      mode: DisplayMode,
      customComponent: z.string().nullish(),
    })
    .optional(),
});
