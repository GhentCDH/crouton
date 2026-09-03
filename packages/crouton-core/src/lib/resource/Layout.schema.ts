import { z } from 'zod';

export const LayoutControlSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    colspan: z.number().int().min(1).max(12).optional(),
    rowspan: z.number().int().min(1).optional(),
    width: z.string().optional(),
    label: z.string().optional(),
    hideLabel: z.boolean().optional(),
    type: z.string().optional(),
    options: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export type LayoutControl = z.infer<typeof LayoutControlSchema>;

export type LayoutNode = {
  type?: 'grid' | 'vertical' | 'horizontal' | 'collapse' | 'group';
  columns?: number;
  title?: string;
  titleKey?: string;
  colspan?: number;
  rowspan?: number;
  label?: string;
  controls?: LayoutControl[];
  items?: LayoutNode[];
};

export const LayoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.object({
    type: z.enum(['grid', 'vertical', 'horizontal', 'collapse', 'group']).optional(),
    columns: z.number().int().min(1).max(12).optional(),
    title: z.string().optional(),
    titleKey: z.string().optional(),
    colspan: z.number().int().min(1).max(12).optional(),
    rowspan: z.number().int().min(1).optional(),
    label: z.string().optional(),
    controls: z.array(LayoutControlSchema).optional(),
    items: z.array(LayoutNodeSchema).optional(),
  }),
);

export const LayoutSchema = z.object({
  form: LayoutNodeSchema.optional(),
  view: LayoutNodeSchema.optional(),
  table: LayoutNodeSchema.optional(),
});

export type Layout = z.infer<typeof LayoutSchema>;
