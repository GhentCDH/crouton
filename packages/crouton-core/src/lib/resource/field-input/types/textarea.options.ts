import { type z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const TextareaOptionsSchema = BaseOptionsSchema.extend({});
export type TextareaOptions = z.infer<typeof TextareaOptionsSchema>;
