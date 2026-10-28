import { z } from 'zod';

/**
 * Presentation config for the `?q=` lookup endpoint. The primary key lives on
 * `CompiledResource.idField`/`CompiledSubResourceConfig.idField`, not here.
 */
export const LookupSchema = z.object({
  label: z.string().optional(),
  labels: z.array(z.string()).optional(),
  /** Separator used when rendering compound lookup labels. */
  separator: z.string().optional(),
});

export type LookupConfig = z.infer<typeof LookupSchema>;
