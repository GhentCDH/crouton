import { z } from 'zod';

import {
  LayoutComponentSchema,
  _LayoutFieldControlSchema,
} from './LayoutControl.schema';
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

export const LayoutTableControlSchema = z.union([
  z.string(),
  LayoutTableFieldControlSchema,
  LayoutComponentSchema,
]);

export const FilterFields = z.string();
export const SearchFields = z.string();

export const LayoutTableSchema = z.object({
  type: z.literal('table').optional(),
  columns: z.number().int().min(1).max(12).optional(),
  title: z.string().optional(),
  titleKey: z.string().optional(),
  label: z.string().optional(),
  searchFields: z.array(SearchFields).optional(),
  filterFields: z.array(FilterFields).optional().default([]),
  controls: z
    .array(LayoutTableControlSchema)
    .optional()
    .describe(
      'Leaf controls in this layout node. Each entry is a column id string, a control config object, or a component reference.',
    ),
  actions: z
    .array(JsonActionSchema)
    .default([])
    .describe(
      'Per-record row actions shown in the table. Each action receives the record id.',
    ),
  tableActions: z
    .array(JsonActionSchema)
    .default([])
    .describe(
      'Global table-level actions with no record id. Shown as toolbar buttons.',
    ),
});
