import { type z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const BooleanOptionsSchema = BaseOptionsSchema.extend({}).meta({
  title: 'Boolean options',
  description: 'Checkbox input. All common options apply; no type-specific options.',
});
export type BooleanOptions = z.infer<typeof BooleanOptionsSchema>;
