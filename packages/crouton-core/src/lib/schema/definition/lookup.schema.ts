import { z } from 'zod';

export const LookupSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export type LookupConfig = z.infer<typeof LookupSchema>;
