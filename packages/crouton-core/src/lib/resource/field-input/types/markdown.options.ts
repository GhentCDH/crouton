import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const MarkdownOptionsSchema = BaseOptionsSchema.extend({
  minHeight: z.string().optional().describe('Minimum editor height, e.g. "200px"'),
});
export type MarkdownOptions = z.infer<typeof MarkdownOptionsSchema>;
