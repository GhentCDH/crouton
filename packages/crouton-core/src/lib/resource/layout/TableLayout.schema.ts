import { z } from 'zod';

import {
  LayoutComponentItemSchema,
  _LayoutFieldControlSchema,
} from './LayoutItem.schema';
import { JsonActionSchema } from '../TableAction.schema';

export const LayoutTableFieldControlSchema = _LayoutFieldControlSchema.extend({
  sortable: z
    .boolean()
    .default(false)
    .describe('Enables a sort toggle on the table column header.'),
  defaultSort: z
    .boolean()
    .default(false)
    .describe(
      'When true, the table is sorted by this column by default. At most one column should set this.',
    ),
});

/** A single item in a table node's `items` list: field id, field control, or component cell. */
export const TableItemSchema = z.union([
  z.string(),
  LayoutTableFieldControlSchema,
  LayoutComponentItemSchema,
]);

/** @deprecated Use `TableItemSchema` */
export const LayoutTableControlSchema = TableItemSchema;

export const FilterFields = z.string();
export const SearchFields = z.string();

// ── TableNodeSchema ────────────────────────────────────────────────────

/**
 * A table node: the innermost node that describes columns, search/filter, and actions.
 * In a flat table layout (no wrapper), this IS `layout.table`.
 * In a wrapper layout, this is the single `{ type: "table" }` descendant node.
 */
export const TableNodeSchema = z.object({
  type: z.literal('table').optional(),
  title: z.string().optional().describe('Static heading shown above the table.'),
  label: z.string().optional().describe('Alias for title; title takes precedence.'),
  searchFields: z.array(SearchFields).optional(),
  filterFields: z.array(FilterFields).optional().default([]),
  items: z
    .array(TableItemSchema)
    .optional()
    .describe(
      'Ordered list of columns. Each entry is a column id string, a field control config, or a component cell.',
    ),
  rowActions: z
    .array(JsonActionSchema)
    .default([])
    .describe('Per-record row actions shown in the table. Each action receives the record id.'),
  tableActions: z
    .array(JsonActionSchema)
    .default([])
    .describe('Global table-level actions shown as toolbar buttons (no record id).'),
});

export type TableNode = z.infer<typeof TableNodeSchema>;

// ── TableWrapperNodeSchema ─────────────────────────────────────────────

export type TableWrapperNode = {
  type?: 'grid' | 'vertical' | 'horizontal' | 'collapse' | 'group';
  columns?: number;
  title?: string;
  titleKey?: string;
  colspan?: number;
  rowspan?: number;
  label?: string;
  items: (z.infer<typeof LayoutComponentItemSchema> | TableWrapperNode | TableNode)[];
};

/** Wrapper node that contains a nested table somewhere in its `items`. */
export const TableWrapperNodeSchema: z.ZodType<TableWrapperNode> = z.lazy(() =>
  z.object({
    type: z
      .enum(['grid', 'vertical', 'horizontal', 'collapse', 'group'])
      .optional(),
    columns: z.number().int().min(1).max(12).optional(),
    title: z.string().optional(),
    titleKey: z.string().optional(),
    colspan: z.number().int().min(1).max(12).optional(),
    rowspan: z.number().int().min(1).max(6).optional(),
    label: z.string().optional(),
    items: z.array(
      z.union([LayoutComponentItemSchema, TableWrapperNodeSchema, TableNodeSchema]),
    ),
  }),
);

// ── TableLayoutRootSchema ──────────────────────────────────────────────

const countTableNodes = (items: unknown[]): number =>
  items.reduce((n: number, item) => {
    if (typeof item !== 'object' || item === null) return n;
    const obj = item as Record<string, unknown>;
    if (obj['type'] === 'table') return n + 1;
    if (Array.isArray(obj['items'])) return n + countTableNodes(obj['items'] as unknown[]);
    return n;
  }, 0);

const hasFieldIdInWrapper = (items: unknown[]): boolean =>
  items.some((item) => {
    if (typeof item === 'string') return true;
    if (typeof item !== 'object' || item === null) return false;
    const obj = item as Record<string, unknown>;
    if (obj['type'] === 'table') return false; // field ids inside the table node are fine
    if (obj['component'] != null) return false;
    // Check nested wrapper items
    if (Array.isArray(obj['items'])) return hasFieldIdInWrapper(obj['items'] as unknown[]);
    return false;
  });

/**
 * The root value of `layout.table`.
 * Either a plain TableNode (flat table) or a wrapper node containing exactly one TableNode.
 */
export const TableLayoutRootSchema = z
  .union([TableNodeSchema, TableWrapperNodeSchema])
  .superRefine((val, ctx) => {
    // Only validate wrapper nodes (ones without type:"table")
    if (
      typeof val !== 'object' ||
      val === null ||
      (val as TableNode).type === 'table' ||
      !Array.isArray((val as TableWrapperNode).items)
    ) {
      return;
    }
    const wrapper = val as TableWrapperNode;

    // D4: exactly one table node in wrapper tree
    const tableCount = countTableNodes(wrapper.items);
    if (tableCount > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: `layout.table wrapper must contain exactly one table node; found ${tableCount}.`,
      });
    }

    // D6: no field ids directly in wrapper nodes (only inside the table node)
    if (hasFieldIdInWrapper(wrapper.items)) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message:
          'Field ids are not allowed directly in wrapper nodes. Place them inside the `{ type: "table" }` node.',
      });
    }
  });

// ── Legacy alias ────────────────────────────────────────────────────────

/**
 * @deprecated Use `TableNodeSchema`. Kept for backward compat with existing preprocess shims.
 * This still accepts `controls` and `actions` — those are handled by the preprocess in ResourceJson.schema.ts.
 */
export const LayoutTableSchema = TableNodeSchema;
