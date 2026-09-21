import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const DateOptionsSchema = BaseOptionsSchema.extend({
  withTime: z.boolean().optional().describe('Force time input on/off, overrides format'),
  min: z.string().optional().describe('Earliest selectable date, ISO or yyyy-MM-dd'),
  max: z.string().optional().describe('Latest selectable date, ISO or yyyy-MM-dd'),
  locale: z.string().optional().describe('BCP-47 locale for month heading and weekday labels').default('en-GB'),
  firstDayOfWeek: z.number().optional().describe('0 = Sunday, 1 = Monday').default(1),
});
export type DateOptions = z.infer<typeof DateOptionsSchema>;
