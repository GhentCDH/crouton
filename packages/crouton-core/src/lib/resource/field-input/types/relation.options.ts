import { z } from 'zod';

import { BaseOptionsSchema } from '../base.options';
import { opt } from '../option-meta';

export const RelationOptionsSchema = BaseOptionsSchema.extend({
  colspan: opt(z.number().optional().default(12), {
    description: 'Grid column span (1–12); defaults to 12 for relation controls',
    default: 12,
    examples: [12, 6],
  }),
  sort: opt(z.string().optional(), {
    description: 'Field to sort related records by',
    examples: ['name', 'createdAt'],
  }),
  sortDir: opt(z.enum(['asc', 'desc']).optional(), {
    description: 'Sort direction',
    default: 'asc',
    examples: ['asc', 'desc'],
  }),
  direction: opt(z.string().optional(), {
    description: 'CSS flex direction for the button layout',
    examples: ['row', 'column'],
  }),
  displayKey: opt(z.string().optional(), {
    description: 'Key used as the display label for related records',
    examples: ['name', 'title'],
  }),
  resource: opt(z.string().optional(), {
    description: 'Path to the related resource.json',
    examples: ['./author.resource.json'],
  }),
}).catchall(z.unknown()).meta({
  title: 'Relation options',
  description: 'Options for the sub-resource relation control',
});
export type RelationOptions = z.infer<typeof RelationOptionsSchema>;
