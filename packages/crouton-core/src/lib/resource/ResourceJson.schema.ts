import { z } from 'zod';

import { CalculatedColumnSchema } from './CalculatedColumn.schema';
import { type JsonColumn, JsonColumnSchema } from './Column';
import { SidebarSchema } from './Sidebar.schema';
import { JsonActionSchema } from './TableAction.schema';
import { JsonIncludeEntrySchema } from './include.schema';
import { JsonOperationsSchema } from '../data-source/Operations.schema';
import { labelFromId } from '../schema/label.helper';

// ── Shared primitives ────────────────────────────────────────────────

const JsonColumnsMapSchema = z.record(
  z.string(),
  JsonColumnSchema.omit({ id: true }).catchall(z.unknown()),
); // map form — key becomes `id`
export type JsonColumnsMap = z.infer<typeof JsonColumnsMapSchema>;
const ColumnsSchema = JsonColumnsMapSchema;

// ── Display / sidebar ────────────────────────────────────────────────

const JsonDisplaySchema = z.object({
  mode: z.enum(['page', 'modal']).default('modal'), // default: 'modal'
  customComponent: z.string().nullable().optional().default(null), // default: null
});

export type JsonDisplay = z.infer<typeof JsonDisplaySchema>;

/** Normalise `columns` from either array or object-map form. */
const normalizeColumns = (
  columns: JsonColumnsMap | undefined,
): JsonColumn[] | undefined => {
  if (!columns) return undefined;
  const raw: JsonColumn[] = Array.isArray(columns)
    ? columns
    : Object.entries(columns).map(([id, col]) => ({ id, ...col }));
  return raw.map((col) => ({
    ...col,
    label: col.label ?? labelFromId(col.id),
  }));
};

// ── Top-level resource.json ──────────────────────────────────────────

export const ResourceJsonShape = z.object({
  name: z.string(), // required — unique id, used as the frontend form id
  route: z.string(), // required — URL segment for generated endpoints
  model: z.string(), // required — Prisma model name
  tag: z.string(), // required — OpenAPI tag
  title: z.string().optional(), // no computed default — used as UI display title
  table: z.string().optional(), // default: same as `model`
  database: z.string().optional(), // default: project's default data source
  sidebar: SidebarSchema.default(SidebarSchema.parse({})), // default: shown, alphabetically ordered, ungrouped
  display: JsonDisplaySchema.default(JsonDisplaySchema.parse({})), // default: { mode: 'modal', customComponent: null }
  operations: JsonOperationsSchema, // required key — but every sub-field defaults to enabled
  columns: ColumnsSchema.default(ColumnsSchema.parse({})), //  id-keyed map; omit for a columnless resource
  calculatedColumns: z.array(CalculatedColumnSchema).default([]),
  actions: z.array(JsonActionSchema).default([]),
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions: z.array(JsonActionSchema).default([]),
  /** Modal width when opening a form for this resource. */
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

export const ResourceJsonSchema = ResourceJsonShape.transform((obj) => {
  const title = obj.title ?? labelFromId(obj.name);

  return { title, ...obj, columns: normalizeColumns(obj.columns) };
});

export type ResourceJson = z.infer<typeof ResourceJsonSchema>;
export type ResourceJsonInput = z.input<typeof ResourceJsonShape>;

export type ResourceConfig = ResourceJson;
