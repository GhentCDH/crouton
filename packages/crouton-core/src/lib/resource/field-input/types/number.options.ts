import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const NumberOptionsSchema = BaseOptionsSchema.extend({});
export type NumberOptions = z.infer<typeof NumberOptionsSchema>;
