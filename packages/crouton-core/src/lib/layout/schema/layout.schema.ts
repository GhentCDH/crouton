import { z } from 'zod';

import { FormLayoutNodeSchema } from './form-node.schema';
import { TableLayoutRootSchema } from './table-node.schema';

export const LayoutSchema = z.object({
  form: FormLayoutNodeSchema.optional().describe(
    'Explicit layout for the create/edit form. When absent, columns are rendered in source order in a grid.',
  ),
  view: FormLayoutNodeSchema.optional().describe(
    'Explicit layout for the read-only detail view. When absent, columns are rendered in source order.',
  ),
  table: TableLayoutRootSchema.optional().describe(
    'Explicit layout for the table view. When absent, all non-hidden columns are shown in source order.',
  ),
});

export type Layout = z.infer<typeof LayoutSchema>;
