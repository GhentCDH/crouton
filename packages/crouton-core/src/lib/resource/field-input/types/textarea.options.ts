import { type z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const TextareaOptionsSchema = BaseOptionsSchema.extend({}).meta({
  title: 'Textarea options',
  description: 'Multi-line text input. All common options apply; no type-specific options.',
});
export type TextareaOptions = z.infer<typeof TextareaOptionsSchema>;
