import { z } from 'zod';

import { CalculatedColumnSchema } from './CalculatedColumn.schema';
import { SidebarSchema } from './Sidebar.schema';
import { JsonActionSchema } from './TableAction.schema';
import { JsonIncludeEntrySchema } from './include.schema';
import { JsonOperationsSchema } from '../data-source/Operations.schema';
import { JsonColumnShape, transformColumn } from './Column';

// ── Shared primitives ────────────────────────────────────────────────

const JsonColumnsMapSchema = z.record(
  z.string(),
  JsonColumnShape.omit({ id: true })
    .catchall(z.unknown())
    .transform(transformColumn),
); // map form — key becomes `id`
export type JsonColumnsMap = z.infer<typeof JsonColumnsMapSchema>;
const ColumnsSchema = JsonColumnsMapSchema;

// ── Display / sidebar ────────────────────────────────────────────────

const JsonDisplaySchema = z.object({
  mode: z.enum(['page', 'modal']).default('modal'), // default: 'modal'
  customComponent: z.string().nullable().optional().default(null), // default: null
});
// ── Top-level resource.json ──────────────────────────────────────────

export const ResourceJsonSchema = z.object({
  name: z.string(), // required — unique id, used as the frontend form id
  route: z.string(), // required — URL segment for generated endpoints
  model: z.string(), // required — Prisma model name
  tag: z.string(), // required — OpenAPI tag
  title: z.string().optional(), // no computed default — used as UI display title
  table: z.string().optional(), // default: same as `model`
  database: z.string().optional(), // default: project's default data source
  sidebar: SidebarSchema.optional(), // default: shown, alphabetically ordered, ungrouped
  display: JsonDisplaySchema.optional(), // default: { mode: 'modal', customComponent: null }
  operations: JsonOperationsSchema, // required key — but every sub-field defaults to enabled
  columns: ColumnsSchema.optional(), // array or id-keyed map; omit for a columnless resource
  calculatedColumns: z.array(CalculatedColumnSchema).optional(),
  actions: z.array(JsonActionSchema).optional(),
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions: z.array(JsonActionSchema).default([]),
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).default('sm'), // default: 'sm' for create/edit modal
  /**
   * Relations to include when querying this resource.
   * Each entry is either a plain relation name (`"author"` → `include: { author: true }`)
   * or an object for nested includes:
   * `{ "relation": "text_author", "include": ["author"] }` →
   *   `include: { text_author: { include: { author: true } } }`
   */
  include: z.array(JsonIncludeEntrySchema).default([]),
});

export type ResourceJson = z.infer<typeof ResourceJsonSchema>;

export type ResourceConfig = ResourceJson;
