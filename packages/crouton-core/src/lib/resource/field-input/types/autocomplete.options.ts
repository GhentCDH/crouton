import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

const AutocompleteBaseSchema = BaseOptionsSchema.extend({
  labelKey: opt(z.string().optional(), {
    description: 'Object key used as the display label in the dropdown',
    examples: ['label', 'name'],
  }),
  valueKey: opt(z.string().optional(), {
    description: 'Object key used as the stored value',
    examples: ['value', 'id'],
  }),
  freeText: opt(z.boolean().optional(), {
    description: 'Allow the user to type a value not in the options list',
  }),
  enableCreate: opt(z.boolean().optional(), {
    description: 'Show a "create" action when no matching option is found',
  }),
  storeValue: opt(z.boolean().optional(), {
    description: 'Store option[valueKey] instead of the whole option object',
  }),
}).meta({
  title: 'Common autocomplete options',
  description: 'Shared options available on all autocomplete variants',
});

export const AutocompleteInlineOptionsSchema = AutocompleteBaseSchema.extend({
  options: opt(z.array(z.unknown()), {
    description: 'Inline array of option items',
    examples: [[{ label: 'Active', value: 'active' }]],
  }),
  values: opt(z.array(z.unknown()).optional(), {
    description: 'Alias for options (deprecated — prefer options)',
    deprecated: true,
  }),
}).meta({ title: 'Inline autocomplete', description: 'Options provided as an inline array' });

export const AutocompleteRemoteOptionsSchema = AutocompleteBaseSchema.extend({
  uri: opt(z.string(), {
    description: 'Remote endpoint URL that returns option items',
    examples: ['/api/authors'],
  }),
  dataField: opt(z.string().optional(), {
    description: 'Field in the API response containing the data array',
    examples: ['data', 'results'],
  }),
  skipAuth: opt(z.boolean().optional(), {
    description: 'Send the request without authentication headers',
  }),
}).meta({ title: 'Remote autocomplete', description: 'Options fetched from a remote endpoint' });

export const AutocompleteResourceOptionsSchema = AutocompleteBaseSchema.extend({
  resource: opt(z.string(), {
    description: 'Relative path to a resource.json used to populate the options',
    examples: ['./author.resource.json'],
  }),
  skipAuth: opt(z.boolean().optional(), {
    description: 'Send the request without authentication headers',
  }),
  dataField: opt(z.string().optional(), {
    description: 'Field in the API response containing the data array',
    examples: ['data', 'results'],
  }),
}).meta({
  title: 'Resource autocomplete',
  description: 'Options populated from a crouton resource',
});

export const AutocompleteOptionsSchema = z
  .union([
    AutocompleteInlineOptionsSchema,
    AutocompleteRemoteOptionsSchema,
    AutocompleteResourceOptionsSchema,
    AutocompleteBaseSchema,
  ])
  .meta({
    title: 'Autocomplete options',
    description: 'Autocomplete options: inline array, remote URI, or resource reference',
  });
