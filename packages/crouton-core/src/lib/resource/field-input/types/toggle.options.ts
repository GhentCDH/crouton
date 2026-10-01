import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const ToggleOptionsSchema = BaseOptionsSchema.extend({
  options: z.array(z.unknown()).optional(),
  values: z.array(z.unknown()).optional(),
  labelKey: z.string().optional(),
  valueKey: z.string().optional(),
  storeValue: z.boolean().optional().describe('Store option[valueKey] instead of the whole object'),
  clearable: z.boolean().optional().describe('Clicking active button clears the value').default(true),
  color: z.string().optional().describe('Btn color for the active button').default('primary'),
  size: z.string().optional().describe('Btn size').default('sm'),
});
