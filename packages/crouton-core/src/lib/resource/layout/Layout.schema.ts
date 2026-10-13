import { z } from 'zod';

import { LayoutNodeSchema } from './LayoutNode.schema';

export const LayoutSchema = z.object({
  form: LayoutNodeSchema.optional().describe(
    'Explicit layout for the create/edit form. When absent, columns are rendered in source order in a grid.',
  ),
  view: LayoutNodeSchema.optional().describe(
    'Explicit layout for the read-only detail view. When absent, columns are rendered in source order.',
  ),
  table: LayoutNodeSchema.optional().describe(
    'Explicit layout for the table view columns. When absent, all non-hidden columns are shown in source order.',
  ),
});

export type Layout = z.infer<typeof LayoutSchema>;
