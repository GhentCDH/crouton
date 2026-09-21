import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const StringOptionsSchema = BaseOptionsSchema.extend({});
export type StringOptions = z.infer<typeof StringOptionsSchema>;
