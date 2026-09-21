import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const DateRangeOptionsSchema = BaseOptionsSchema.extend({
  fromLabel: z.string().optional().describe('Label above the start date input. Defaults to "From"'),
  toLabel: z.string().optional().describe('Label above the end date input. Defaults to "To"'),
  fromField: z.string().optional().describe('JSON object key for the start date. Defaults to "from"'),
  toField: z.string().optional().describe('JSON object key for the end date. Defaults to "to"'),
});
