import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const MarkdownOptionsSchema = BaseOptionsSchema.extend({
  minHeight: opt(z.string().optional(), {
    description: 'Minimum editor height',
    examples: ['200px', '400px'],
  }),
}).meta({ title: 'Markdown options', description: 'Options for the Markdown rich-text editor' });
