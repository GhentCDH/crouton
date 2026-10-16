import { z } from 'zod';

import { FormLayoutNodeSchema } from './LayoutNode.schema';
import { TableLayoutRootSchema } from './TableLayout.schema';

export const ContainerSchema = z.object({
  mode: z.enum(['modal', 'page']).default('modal').describe(
    'How this context opens: "modal" (default) shows a dialog; "page" navigates to a route.',
  ),
  size: z.enum(['xs', 'sm', 'lg', 'xl']).optional().describe(
    'Width of the modal dialog. Only applies when mode is "modal". Default: "sm".',
  ),
});
export type Container = z.infer<typeof ContainerSchema>;

const FormLayoutWithContainerSchema = FormLayoutNodeSchema.and(
  z.object({ container: ContainerSchema.optional() }),
);
const ViewLayoutWithContainerSchema = FormLayoutNodeSchema.and(
  z.object({
    container: ContainerSchema.optional(),
    component: z.string().optional().describe(
      'Import path to a custom Vue component for the detail view. When set, the default view layout is ignored.',
    ),
  }),
);

export const LayoutSchema = z.object({
  form: FormLayoutWithContainerSchema.optional().describe(
    'Explicit layout for the create/edit form. When absent, columns are rendered in source order in a grid.',
  ),
  view: ViewLayoutWithContainerSchema.optional().describe(
    'Explicit layout for the read-only detail view. When absent, columns are rendered in source order.',
  ),
  table: TableLayoutRootSchema.optional().describe(
    'Explicit layout for the table view. When absent, all non-hidden columns are shown in source order.',
  ),
});

export type Layout = z.infer<typeof LayoutSchema>;
