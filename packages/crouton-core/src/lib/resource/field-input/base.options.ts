import { z } from 'zod';

import { opt } from './option-meta';

export const BaseOptionsSchema = z
  .object({
    label: opt(z.string().optional(), {
      description: 'Override the field label',
      examples: ['My label'],
    }),
    hideLabel: opt(z.boolean().optional(), {
      description: 'Hide the field label',
    }),
    placeholder: opt(z.string().optional(), {
      description: 'Placeholder text shown inside the input when empty',
      examples: ['Search...'],
    }),
    readonly: opt(z.boolean().optional(), {
      description: 'Render the field in read-only mode',
    }),
    colspan: opt(z.number().optional(), {
      description: 'Grid column span (1–12)',
      examples: [6, 12],
    }),
    width: opt(z.string().optional(), {
      description: 'Named width (xs, sm, md, lg, xl, full) or any CSS value',
      examples: ['md', '240px'],
    }),
    styles: opt(z.record(z.string(), z.unknown()).optional(), {
      description: 'Inline CSS style object applied to the field wrapper',
      examples: [{ color: 'red' }],
    }),
    customRender: opt(z.string().optional(), {
      description:
        'Name of a globally registered Vue component to render instead of the default input',
      examples: ['MyCustomInput'],
    }),
  })
  .catchall(z.unknown())
  .meta({ title: 'Base options', description: 'Accepted by every field input type' });

export type BaseOptions = z.infer<typeof BaseOptionsSchema>;
