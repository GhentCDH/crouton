import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const RelationOptionsSchema = BaseOptionsSchema.extend({
  colspan: z.number().optional().default(12),
  sort: z.string().optional().describe('Field to sort related records by'),
  sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction, defaults to asc'),
  direction: z.string().optional().describe('CSS flex direction for the button layout'),
  displayKey: z.string().optional().describe('Key used as display label'),
  resource: z.string().optional().describe('Path to the related resource'),
}).catchall(z.unknown());
export type RelationOptions = z.infer<typeof RelationOptionsSchema>;
