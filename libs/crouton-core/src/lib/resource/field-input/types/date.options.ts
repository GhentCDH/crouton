import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const DateOptionsSchema = BaseOptionsSchema.extend({
  withTime: opt(z.boolean().optional(), {
    description: 'Force time input on/off, overrides format detection',
  }),
  min: opt(z.string().optional(), {
    description: 'Earliest selectable date (ISO 8601 or yyyy-MM-dd)',
    examples: ['2020-01-01'],
  }),
  max: opt(z.string().optional(), {
    description: 'Latest selectable date (ISO 8601 or yyyy-MM-dd)',
    examples: ['2099-12-31'],
  }),
  locale: opt(z.string().optional().default('en-GB'), {
    description: 'BCP-47 locale for month heading and weekday labels',
    examples: ['en-GB', 'nl-BE'],
    default: 'en-GB',
  }),
  firstDayOfWeek: opt(z.number().optional().default(1), {
    description: 'First day of the week: 0 = Sunday, 1 = Monday',
    examples: [0, 1],
    default: 1,
  }),
}).meta({ title: 'Date options', description: 'Options for the date picker (and dateTime alias)' });
