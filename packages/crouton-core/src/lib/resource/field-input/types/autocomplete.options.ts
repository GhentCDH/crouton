import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';

const AutocompleteBaseSchema = BaseOptionsSchema.extend({
  labelKey: z.string().optional(),
  valueKey: z.string().optional(),
  freeText: z.boolean().optional(),
  enableCreate: z.boolean().optional(),
  storeValue: z.boolean().optional(),
});

export const AutocompleteInlineOptionsSchema = AutocompleteBaseSchema.extend({
  options: z.array(z.unknown()),
  values: z.array(z.unknown()).optional(),
});

export const AutocompleteRemoteOptionsSchema = AutocompleteBaseSchema.extend({
  uri: z.string().describe('Remote endpoint URL'),
  dataField: z.string().optional().describe('Field in response containing the data array'),
  skipAuth: z.boolean().optional(),
});

export const AutocompleteResourceOptionsSchema = AutocompleteBaseSchema.extend({
  resource: z.string().describe('Relative path to a resource.json'),
  skipAuth: z.boolean().optional(),
  dataField: z.string().optional(),
});

export const AutocompleteOptionsSchema = z
  .union([
    AutocompleteInlineOptionsSchema,
    AutocompleteRemoteOptionsSchema,
    AutocompleteResourceOptionsSchema,
    AutocompleteBaseSchema,
  ])
  .describe('Autocomplete options: inline array, remote URI, or resource reference');

