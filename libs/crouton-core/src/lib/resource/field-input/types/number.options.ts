import { type z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const NumberOptionsSchema = BaseOptionsSchema.extend({}).meta({
  title: 'Number options',
  description: 'Numeric input (also used for Integer alias). All common options apply; no type-specific options.',
});
export type NumberOptions = z.infer<typeof NumberOptionsSchema>;
