import { z } from 'zod';

import {
  type LayoutControl,
  LayoutControlSchema,
} from './LayoutControl.schema';
import { LayoutTableSchema } from './TableLayout.schema';

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
  // Table-specific optional fields (only meaningful when type === 'table' or on LayoutTableSchema nodes)
  searchFields?: string[];
  filterFields?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tableActions?: any[];
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
export const LayoutNodeSchema = z.union([LayoutTableSchema, _LayoutNodeSchema]);
