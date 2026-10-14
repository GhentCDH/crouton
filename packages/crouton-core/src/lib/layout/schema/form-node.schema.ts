import { z } from 'zod';

import {
  LayoutComponentItemSchema,
  type LayoutControl,
  LayoutFieldItemSchema,
} from './item.schema';

// ── FormLayoutNode ─────────────────────────────────────────────────────

export type FormLayoutNode = {
  type?: 'grid' | 'vertical' | 'horizontal' | 'collapse' | 'group';
  columns?: number;
  title?: string;
  titleKey?: string;
  colspan?: number;
  rowspan?: number;
  label?: string;
  items?: (z.infer<typeof LayoutFieldItemSchema> | z.infer<typeof LayoutComponentItemSchema> | FormLayoutNode)[];
};

export const FormLayoutNodeSchema: z.ZodType<FormLayoutNode> = z.lazy(() =>
  z.object({
    type: z
      .enum(['grid', 'vertical', 'horizontal', 'collapse', 'group'])
      .optional()
      .describe(
        'Layout container type. "grid" arranges items in a CSS grid; "vertical"/"horizontal" stack them; "collapse" is a collapsible section; "group" is a labeled group.',
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
    items: z
      .array(
        z.union([LayoutFieldItemSchema, LayoutComponentItemSchema, FormLayoutNodeSchema]),
      )
      .optional()
      .describe(
        'Ordered list of items in this layout node. Each entry is a column id string, a field config object, a component reference, or a nested layout node.',
      ),
  }),
);

// ── LayoutNode (legacy) ─────────────────────────────────────────────────
// Kept for backward compat with Phase 4 consumers. Will be removed once
// all consumers migrate to FormLayoutNode / TableNode.

export type LayoutNode = {
  type?: 'grid' | 'vertical' | 'horizontal' | 'collapse' | 'group' | 'table';
  columns?: number;
  title?: string;
  titleKey?: string;
  colspan?: number;
  rowspan?: number;
  label?: string;
  /** @deprecated Use `items` */
  controls?: LayoutControl[];
  items?: (LayoutControl | LayoutNode)[];
  searchFields?: string[];
  filterFields?: string[];
  actions?: unknown[];
  tableActions?: unknown[];
};

/** @deprecated Use `FormLayoutNodeSchema`. Kept as an alias. */
export const _LayoutNodeSchema = FormLayoutNodeSchema;

export const LayoutNodeSchema = FormLayoutNodeSchema;
