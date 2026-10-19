import { z } from 'zod';

import {
  LayoutComponentItemSchema,
  _LayoutFieldControlSchema,
} from './LayoutItem.schema';
import { JsonActionSchema } from '../TableAction.schema';

const TABLE_REMOVED_KEYS = ['colspan', 'rowspan', 'hideLabel'] as const;

export const LayoutTableFieldControlSchema = z
  .object({ id: z.string() })
  .passthrough()
  .transform((val, ctx) => {
    for (const key of TABLE_REMOVED_KEYS) {
      if ((val as Record<string, unknown>)[key] !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `'${key}' is not valid on table items; remove it`,
        });
      }
    }
    return val;
  })
  .pipe(
    _LayoutFieldControlSchema
      .omit({ colspan: true, rowspan: true, hideLabel: true })
      .extend({
        sortable: z
          .boolean()
          .default(false)
          .describe('Enables a sort toggle on the table column header.'),

        width: z
          .union([z.enum(['xs', 'sm', 'md', 'lg', 'xl']), z.string()])
          .optional()
          .describe('Column width: named size (xs–xl, same scale as form) or a CSS value like "12rem".'),
        minWidth: z.string().default('8rem').describe('Minimum column width as a CSS value.'),
        maxWidth: z.string().default('24rem').describe('Maximum column width as a CSS value.'),
        align: z
          .enum(['left', 'center', 'right'])
          .optional()
          .describe('Horizontal text alignment. Defaults to right for number columns, left otherwise.'),
        truncate: z
          .union([z.boolean(), z.number().int().positive()])
          .default(true)
          .describe('Truncate long text with ellipsis. true = 1-line clamp; number = line count.'),
        pin: z
          .enum(['left', 'right'])
          .optional()
          .describe('Stick this column to the left or right edge of the table.'),
        visible: z
          .boolean()
          .default(true)
          .describe(
            'false = hidden initially but available in column chooser.',
          ),
        headerTooltip: z
          .string()
          .optional()
          .describe('Help text shown on the column header.'),
      }),
  );

/** A single item in a table node's `items` list: field id, field control, or component cell. */
export const TableItemSchema = z.union([
  z.string(),
  LayoutTableFieldControlSchema,
  LayoutComponentItemSchema,
]);

/** @deprecated Use `TableItemSchema` */
export const LayoutTableControlSchema = TableItemSchema;

export const FilterFields = z.string();

// ── TableNodeSchema ────────────────────────────────────────────────────

/**
 * A table node: the innermost node that describes columns, search/filter, and actions.
 * In a flat table layout (no wrapper), this IS `layout.table`.
 * In a wrapper layout, this is the single `{ type: "table" }` descendant node.
 */
export const TableNodeSchema = z.object({
  type: z.literal('table').optional(),
  title: z
    .string()
    .optional()
    .describe('Static heading shown above the table.'),
  label: z
    .string()
    .optional()
    .describe('Alias for title; title takes precedence.'),
  filterFields: z.array(FilterFields).optional().default([]),
  defaultSort: z
    .object({
      field: z
        .string()
        .default('id')
        .describe('Column id to sort by. Defaults to `id`.'),
      sortDir: z
        .enum(['asc', 'desc'])
        .default('asc')
        .describe('Sort direction. Default: asc.'),
    })
    .optional()
    .describe('Default sort applied on initial table load. Omit to use the first sortable column.'),
  items: z
    .array(TableItemSchema)
    .optional()
    .describe(
      'Ordered list of columns. Each entry is a column id string, a field control config, or a component cell.',
    ),
  rowActions: z
    .array(JsonActionSchema)
    .default([])
    .describe(
      'Per-record row actions shown in the table. Each action receives the record id.',
    ),
  tableActions: z
    .array(JsonActionSchema)
    .default([])
    .describe(
      'Global table-level actions shown as toolbar buttons (no record id).',
    ),
  pageSize: z
    .number()
    .int()
    .positive()
    .default(20)
    .describe('Default page size. Server may cap it.'),
  pageSizes: z
    .array(z.number().int().positive())
    .default([20, 50, 100])
    .describe('Page-size options shown in the selector (e.g. [20, 50, 100]).'),
  density: z
    .enum(['normal', 'compact'])
    .optional()
    .default('normal')
    .describe('Row density. Default: normal.'),
  selectable: z
    .boolean()
    .optional()
    .describe('Show row checkboxes for multi-select.'),
  rowClick: z
    .enum(['view', 'edit', 'none'])
    .default('view')
    .describe('Action when a table row is clicked.'),
  emptyText: z
    .string()
    .optional()
    .describe('Message shown when the table has no rows.'),
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
const WRAPPER_TYPES = new Set<string>(['grid', 'vertical', 'horizontal', 'collapse', 'group']);

export const TableLayoutRootSchema = z
  .union([TableNodeSchema, TableWrapperNodeSchema])
  .superRefine((val, ctx) => {
    if (typeof val !== 'object' || val === null) return;
    const node = val as Record<string, unknown>;
    // A flat TableNode: no wrapper type, OR has table-node-only fields
    const isWrapper =
      typeof node['type'] === 'string' &&
      WRAPPER_TYPES.has(node['type'] as string);
    if (!isWrapper) return;
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
