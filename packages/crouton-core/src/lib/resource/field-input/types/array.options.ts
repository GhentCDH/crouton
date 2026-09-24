import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const ArrayOptionsSchema = BaseOptionsSchema.extend({
  layout: z.enum(['row', 'column']).optional(),
  elementLabelProp: z.string().optional(),
  hideActions: z.boolean().optional(),
});
export type ArrayOptions = z.infer<typeof ArrayOptionsSchema>;
