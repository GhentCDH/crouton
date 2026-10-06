import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const DateRangeOptionsSchema = BaseOptionsSchema.extend({
  fromLabel: opt(z.string().optional(), {
    description: 'Label above the start date input',
    default: 'From',
    examples: ['From', 'Start date'],
  }),
  toLabel: opt(z.string().optional(), {
    description: 'Label above the end date input',
    default: 'To',
    examples: ['To', 'End date'],
  }),
  fromField: opt(z.string().optional(), {
    description: 'JSON object key for the start date',
    default: 'from',
    examples: ['from', 'startDate'],
  }),
  toField: opt(z.string().optional(), {
    description: 'JSON object key for the end date',
    default: 'to',
    examples: ['to', 'endDate'],
  }),
}).meta({
  title: 'Date-range options',
  description: 'Options for the from/to date range picker',
});
