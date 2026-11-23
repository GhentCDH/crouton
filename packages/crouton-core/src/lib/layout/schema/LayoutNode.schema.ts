import { z } from 'zod';

import {
  LayoutComponentItemSchema,
  type LayoutControl,
  LayoutFieldItemSchema,
} from './LayoutItem.schema';

// ── FormLayoutNode ─────────────────────────────────────────────────────

export type FormLayoutNode = {
  type?: 'grid' | 'vertical' | 'horizontal' | 'collapse' | 'group' | 'custom';
  component?: string;
  props?: Record<string, unknown>;
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
      .enum(['grid', 'vertical', 'horizontal', 'collapse', 'group', 'custom'])
      .optional()
      .describe(
        'Layout container type. "grid" arranges items in a CSS grid; "vertical"/"horizontal" stack them; "collapse" is a collapsible section; "group" is a labeled group; "custom" renders the registered component named in `component`.',
      ),
    component: z
      .string()
      .optional()
      .describe(
        'Name of the registered Vue layout component that renders this node and its items. Required when type is "custom".',
      ),
    props: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Static props passed to the custom layout component, next to the runtime props `elements`, `data`, `readonly`, `schema` and `uischema`.',
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
        // Node before component item so a `type: "custom"` node keeps its `items`;
        // a plain `{ component }` fails NestedNodeSchema and lands on the component item.
        z.union([LayoutFieldItemSchema, NestedNodeSchema, LayoutComponentItemSchema]),
      )
      .optional()
      .describe(
        'Ordered list of items in this layout node. Each entry is a column id string, a field config object, a component reference, or a nested layout node.',
      ),
  }).superRefine((node, ctx) => {
    if (node.type === 'custom' && !node.component) {
      ctx.addIssue({ code: 'custom', path: ['component'], message: 'A "custom" layout node needs a `component` name.' });
    }
  }),
);

/** A nested node: `component` only with `type: "custom"`, otherwise the item is a component item. */
const NestedNodeSchema: z.ZodType<FormLayoutNode> = z.lazy(() =>
  FormLayoutNodeSchema.refine((node) => node.type === 'custom' || node.component === undefined),
);

// ── LayoutNode (legacy) ─────────────────────────────────────────────────
// Kept for backward compat with Phase 4 consumers. Will be removed once
// all consumers migrate to FormLayoutNode / TableNode.

export type LayoutNode = {
  type?: 'grid' | 'vertical' | 'horizontal' | 'collapse' | 'group' | 'custom' | 'table';
  component?: string;
  props?: Record<string, unknown>;
  columns?: number;
  title?: string;
  titleKey?: string;
  colspan?: number;
  rowspan?: number;
  label?: string;
  /** @deprecated Use `items` */
  controls?: LayoutControl[];
  items?: (LayoutControl | LayoutNode)[];
  actions?: unknown[];
  tableActions?: unknown[];
};

