import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const BooleanOptionsSchema = BaseOptionsSchema.extend({});
export type BooleanOptions = z.infer<typeof BooleanOptionsSchema>;
