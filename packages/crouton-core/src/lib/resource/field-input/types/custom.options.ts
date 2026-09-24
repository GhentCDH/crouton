import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const CustomOptionsSchema = BaseOptionsSchema.extend({
  customRender: z.string().optional(),
}).catchall(z.unknown());
export type CustomOptions = z.infer<typeof CustomOptionsSchema>;
