import { z } from 'zod';

const NestedStringRecord: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z.record(z.string(), z.union([z.string(), NestedStringRecord])),
);

export const TranslationBundleSchema = z
  .object({
    app: z
      .object({
        title: z.string().optional(),
      })
      .optional(),
    sidebarGroups: z.record(z.string(), z.string()).optional(),
    resources: z
      .record(
        z.string(),
        z
          .object({
            title: z.string().optional(),
            sidebar: z.string().optional(),
            columns: z.record(z.string(), z.string()).optional(),
            actions: z.record(z.string(), z.string()).optional(),
            subResources: z
              .record(
                z.string(),
                z
                  .object({
                    title: z.string().optional(),
                    columns: z.record(z.string(), z.string()).optional(),
                  })
                  .optional(),
              )
              .optional(),
          })
          .optional(),
      )
      .optional(),
    enums: z.record(z.string(), z.record(z.string(), z.string())).optional(),
    ui: NestedStringRecord.optional(),
    validation: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export type TranslationBundle = z.infer<typeof TranslationBundleSchema>;
