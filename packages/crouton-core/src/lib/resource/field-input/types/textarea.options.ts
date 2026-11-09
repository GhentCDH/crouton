import { type z, z as zod } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const TextareaOptionsSchema = BaseOptionsSchema.extend({
  minHeight: opt(zod.union([zod.string(), zod.number()]).optional(), {
    description: 'Minimum height of the textarea (CSS value or pixel number)',
    examples: ['200px', 200],
  }),
  height: opt(zod.union([zod.string(), zod.number()]).optional(), {
    description: 'Fixed height of the textarea (CSS value or pixel number)',
    examples: ['400px', 400],
  }),
  directionField: opt(zod.string().optional(), {
    description: 'Form field path whose value controls text direction (ltr/rtl)',
    examples: ['language'],
  }),
  direction: opt(zod.enum(['ltr', 'rtl']).optional(), {
    description: 'Explicit text direction when not driven by directionField',
    default: 'ltr',
    examples: ['ltr', 'rtl'],
  }),
}).meta({
  title: 'Textarea options',
  description: 'Multi-line text input.',
});
export type TextareaOptions = z.infer<typeof TextareaOptionsSchema>;
