import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const SelectOptionsSchema = BaseOptionsSchema.extend({
  options: opt(z.array(z.unknown()).optional(), {
    description: 'Inline array of option items',
    examples: [[{ label: 'Active', value: 'active' }]],
  }),
  values: opt(z.array(z.unknown()).optional(), {
    description:
      'Local option list. Entries are { value, label } objects, or plain values (strings/numbers/booleans) — when the column also references a shared `enum`, plain values are resolved against the enum registry to restrict the shared list for this screen, with labels taken from the enum. Rows whose stored value is outside this list cannot be edited from this screen.',
    examples: [
      [
        { value: 'internal', label: 'Internal' },
        { value: 'wikidata', label: 'Wikidata' },
      ],
      ['internal', 'wikidata'],
    ],
  }),
  displayValues: opt(z.array(z.unknown()).optional(), {
    description:
      'Full option list used for label resolution when `values` restricts a shared `enum`. Written by the loader at load time (from the enum registry) — not meant to be set by hand.',
    examples: [[{ value: 'internal', label: 'Internal' }]],
  }),
  resource: opt(z.string().optional(), {
    description: 'Relative path to a resource.json used to populate the options',
    examples: ['./status.resource.json'],
  }),
  labelKey: opt(z.string().optional(), {
    description: 'Object key used as the display label',
    examples: ['label', 'name'],
  }),
  valueKey: opt(z.string().optional(), {
    description: 'Object key used as the stored value',
    examples: ['value', 'id'],
  }),
  uri: opt(z.string().optional(), {
    description: 'Remote endpoint URL for fetching options',
    examples: ['/api/statuses'],
  }),
  dataField: opt(z.string().optional(), {
    description: 'Field in the API response containing the data array',
    examples: ['data', 'results'],
  }),
  clearable: opt(z.boolean().optional(), {
    description: 'Show a clear button to remove the selected value',
  }),
  storeValue: opt(z.boolean().optional(), {
    description: 'Store option[valueKey] instead of the whole option object',
  }),
}).meta({
  title: 'Select options',
  description: 'Options for the select dropdown and multi-select (mutliSelect alias)',
});
