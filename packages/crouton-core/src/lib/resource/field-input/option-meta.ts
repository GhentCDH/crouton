import { z } from 'zod';

export type FieldOptionMeta = {
  description: string;
  examples?: unknown[];
  default?: unknown;
  deprecated?: boolean;
  since?: string;
};

export const opt = <T extends z.ZodTypeAny>(schema: T, meta: FieldOptionMeta): T =>
  schema.meta(meta) as T;
