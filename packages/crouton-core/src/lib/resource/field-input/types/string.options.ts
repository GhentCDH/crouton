import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

const NormalizedUniqueSchema = z.object({
  enabled: z.boolean(),
  scope: z.array(z.string()).optional(),
  caseInsensitive: z.boolean().optional(),
  message: z.string().optional(),
});

export const StringOptionsSchema = BaseOptionsSchema.extend({
  clearable: opt(z.boolean().optional(), {
    description: 'Show a clear (✕) button inside the input when it has a value',
    default: false,
  }),
  /** Async uniqueness validation: present when the column declares `unique`. */
  unique: NormalizedUniqueSchema.optional().meta({
    description: 'Async uniqueness validation: present when the column declares `unique`.'
  }),
}).meta({
  title: 'String options',
  description: 'Plain text input. All common options apply, plus `clearable`.',
});
export type StringOptions = z.infer<typeof StringOptionsSchema>;
