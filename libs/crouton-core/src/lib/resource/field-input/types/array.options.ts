import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const ArrayOptionsSchema = BaseOptionsSchema.extend({
  layout: opt(z.enum(['row', 'column']).optional(), {
    description: 'Direction in which array items are stacked',
    examples: ['row', 'column'],
  }),
  elementLabelProp: opt(z.string().optional(), {
    description: 'Property of each array item used as its label in the UI',
    examples: ['name', 'title'],
  }),
  hideActions: opt(z.boolean().optional(), {
    description: 'Hide the add/remove action buttons',
  }),
}).meta({ title: 'Array options', description: 'Options for the detail/array layout control' });
export type ArrayOptions = z.infer<typeof ArrayOptionsSchema>;
