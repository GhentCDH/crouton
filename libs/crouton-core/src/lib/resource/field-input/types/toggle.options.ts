import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const ToggleOptionsSchema = BaseOptionsSchema.extend({
  options: opt(z.array(z.unknown()).optional(), {
    description: 'Array of option items rendered as toggle buttons',
    examples: [[{ label: 'Yes', value: true }, { label: 'No', value: false }]],
  }),
  values: opt(z.array(z.unknown()).optional(), {
    description: 'Alias for options (deprecated — prefer options)',
    deprecated: true,
  }),
  labelKey: opt(z.string().optional(), {
    description: 'Object key used as the button label',
    examples: ['label'],
  }),
  valueKey: opt(z.string().optional(), {
    description: 'Object key used as the stored value',
    examples: ['value'],
  }),
  storeValue: opt(z.boolean().optional(), {
    description: 'Store option[valueKey] instead of the whole option object',
  }),
  clearable: opt(z.boolean().optional().default(true), {
    description: 'Clicking the active button again clears the value',
    default: true,
  }),
  color: opt(z.string().optional().default('primary'), {
    description: 'Color token applied to the active button',
    examples: ['primary', 'secondary'],
    default: 'primary',
  }),
  size: opt(z.string().optional().default('sm'), {
    description: 'Size token for the buttons',
    examples: ['sm', 'md', 'lg'],
    default: 'sm',
  }),
}).meta({ title: 'Toggle options', description: 'Options for the toggle button-group control' });
