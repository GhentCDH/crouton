import { z } from 'zod';

export const EnumEntrySchema = z.object({
  value: z.unknown(),
  label: z.string(),
});

export type EnumEntry = z.infer<typeof EnumEntrySchema>;

export const EnumRegistrySchema = z
  .record(z.string(), z.array(EnumEntrySchema))
  .default({});

export type EnumRegistry = z.infer<typeof EnumRegistrySchema>;
