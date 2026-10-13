import { z } from 'zod';

import {
  type LayoutControl,
  LayoutControlSchema,
} from './LayoutControl.schema';
import { FilterFields, LayoutTableSchema, SearchFields } from './TableLayout.schema';
import { JsonActionSchema } from '../TableAction.schema';

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
  searchFields?: string[];
  filterFields?: string[];
  actions?: unknown[];
  tableActions?: unknown[];
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
    searchFields: z
      .array(SearchFields)
      .optional()
      .describe('Column ids used for ?q= free-text search. Inherited by the backend from the outer layout wrapper.'),
    filterFields: z
      .array(FilterFields)
      .optional()
      .default([])
      .describe('Column ids shown in the filter panel.'),
    actions: z
      .array(JsonActionSchema)
      .default([])
      .describe('Per-record row actions shown in the table.'),
    tableActions: z
      .array(JsonActionSchema)
      .default([])
      .describe('Global table-level actions shown as toolbar buttons.'),
  }),
);
export const LayoutNodeSchema = z.union([LayoutTableSchema, _LayoutNodeSchema]);
