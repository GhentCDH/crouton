import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

export const SelectOptionsSchema = BaseOptionsSchema.extend({
  options: z.array(z.unknown()).optional(),
  values: z.array(z.unknown()).optional(),
  resource: z.string().optional(),
  labelKey: z.string().optional(),
  valueKey: z.string().optional(),
  uri: z.string().optional().describe('Remote endpoint URL for fetching options'),
  dataField: z.string().optional().describe('Field in response containing the data array'),
  clearable: z.boolean().optional().describe('Allow clearing the selected value'),
  storeValue: z.boolean().optional().describe('Store option[valueKey] instead of the whole object'),
});
