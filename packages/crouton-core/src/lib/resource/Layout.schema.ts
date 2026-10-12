import { z } from 'zod';

export const LayoutFieldControlSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    colspan: z.number().int().min(1).max(12).optional(),
    rowspan: z.number().int().min(1).max(6).optional(),
    width: z.string().optional(),
    label: z.string().optional(),
    hideLabel: z.boolean().optional(),
    type: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export const LayoutComponentSchema = z.object({
  component: z.string(),
  colspan: z.number().int().min(1).max(12).optional(),
  rowspan: z.number().int().min(1).max(6).optional(),
  width: z.string().optional(),
  label: z.string().optional(),
});

export const LayoutControlSchema = z.union([
  LayoutFieldControlSchema,
  LayoutComponentSchema,
]);

export type LayoutControl = z.infer<typeof LayoutControlSchema>;

export const isComponentControl = (
  ctrl: LayoutControl,
): ctrl is z.infer<typeof LayoutComponentSchema> =>
  typeof ctrl !== 'string' && 'component' in ctrl;

export type LayoutNode = {
  type?: 'grid' | 'vertical' | 'horizontal' | 'collapse' | 'group' | 'table';
  columns?: number;
  title?: string;
  titleKey?: string;
  colspan?: number;
  rowspan?: number;
  label?: string;
  controls?: LayoutControl[];
  items?: LayoutNode[];
};

export const _LayoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.object({
    type: z
      .enum(['grid', 'vertical', 'horizontal', 'collapse', 'group'])
      .optional()
      .describe(
        'Layout container type. "grid" arranges controls in a CSS grid; "vertical"/"horizontal" stack them; "collapse" is a collapsible section; "group" is a labeled group.',
      ),
    columns: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe(
        'Number of grid columns (1–12). Only applies when type is "grid".',
      ),
    title: z
      .string()
      .optional()
      .describe('Static title shown above the layout section.'),
    titleKey: z
      .string()
      .optional()
      .describe('Column id whose value is used as the dynamic section title.'),
    colspan: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe('Column span of this node within its parent grid (1–12).'),
    rowspan: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe('Row span of this node within its parent grid (1–6).'),
    label: z
      .string()
      .optional()
      .describe('Label shown on the section or group header.'),
    controls: z
      .array(LayoutControlSchema)
      .optional()
      .describe(
        'Leaf controls in this layout node. Each entry is a column id string or a control config object.',
      ),
    items: z
      .array(LayoutNodeSchema)
      .optional()
      .describe(
        'Nested layout nodes. Use for nested grids, groups, or collapsible sections.',
      ),
  }),
);

export const LayoutTableSchema = z.object({
  type: z.literal('table').optional(),
  columns: z.number().int().min(1).max(12).optional(),
  title: z.string().optional(),
  titleKey: z.string().optional(),
  label: z.string().optional(),
  controls: z
    .array(LayoutControlSchema)
    .optional()
    .describe(
      'Leaf controls in this layout node. Each entry is a column id string, a control config object, or a component reference.',
    ),
});

export const LayoutNodeSchema = z.union([LayoutTableSchema, _LayoutNodeSchema]);

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
