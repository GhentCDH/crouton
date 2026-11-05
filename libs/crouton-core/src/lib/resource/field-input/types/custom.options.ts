import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const CustomOptionsSchema = BaseOptionsSchema.extend({
  customRender: opt(z.string().optional(), {
    description:
      'Name of the globally registered Vue component to render (overrides the base option)',
    examples: ['MyWidget'],
  }),
}).catchall(z.unknown()).meta({
  title: 'Custom options',
  description: 'Options for app-registered custom renderer components',
});
export type CustomOptions = z.infer<typeof CustomOptionsSchema>;
