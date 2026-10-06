import { type z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

const NormalizedUniqueSchema = z.object({
  enabled: z.boolean(),
  scope: z.array(z.string()).optional(),
  caseInsensitive: z.boolean().optional(),
  message: z.string().optional(),
});

export const StringOptionsSchema = BaseOptionsSchema.extend({
  /** Async uniqueness validation: present when the column declares `unique`. */
  unique: NormalizedUniqueSchema.optional().meta({
    description: 'Async uniqueness validation: present when the column declares `unique`.'
  }),
}).meta({
  title: 'String options',
  description: 'Plain text input. All common options apply; no type-specific options.',
});
export type StringOptions = z.infer<typeof StringOptionsSchema>;
