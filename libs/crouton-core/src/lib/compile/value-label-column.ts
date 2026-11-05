import { z } from 'zod';

const ValueSchema = z.object({
  value: z.unknown(),
  label: z.string(),
});

export const ValueLabelColumnSchema = z.object({
  field: z.string(),
  values: z.array(ValueSchema).default([]),
  enumName: z.string().optional(),
});

export type ValueLabelColumn = z.infer<typeof ValueLabelColumnSchema>;
