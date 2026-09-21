import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const SelectOptionsSchema = BaseOptionsSchema.extend({
  options: z.array(z.unknown()).optional(),
  values: z.array(z.unknown()).optional(),
  resource: z.string().optional(),
  labelKey: z.string().optional(),
  valueKey: z.string().optional(),
});
export type SelectOptions = z.infer<typeof SelectOptionsSchema>;
