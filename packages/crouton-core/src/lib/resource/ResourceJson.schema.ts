import { z } from 'zod';

import { SidebarSchema } from './Sidebar.schema';
import { JsonActionSchema } from './TableAction.schema';
import { JsonIncludeEntrySchema } from './include.schema';
import { JsonOperationsSchema } from '../data-source/Operations.schema';

// ── Shared primitives ────────────────────────────────────────────────

const RelationType = z.enum([
  'oneToOne',
  'manyToOne',
  'oneToMany',
  'manyToMany',
]);

// Used by showWhen / hideWhen / disabledWhen
const WhenConditionSchema = z.object({
  field: z.string(), // required
  eq: z.unknown().optional(),
  neq: z.unknown().optional(),
  exists: z.boolean().optional(),
  notExists: z.boolean().optional(),
});

// Used by row-action / table-action `condition`
const ActionConditionSchema = z.object({
  field: z.string(), // required
  op: z
    .enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists', 'notExists'])
    .optional(), // default: 'eq'
  value: z.unknown().optional(), // not required for exists/notExists
});

const DetailControlSchema = z.object({
  property: z.string(), // required
  type: z.string().optional(), // default: 'text'
  options: z.record(z.string(), z.unknown()).optional(),
  hideLabel: z.boolean().optional(), // default: false
  width: z.string().optional(),
});

const DetailConfigSchema = z.object({
  layout: z.enum(['collapse', 'row']), // required
  titleKey: z.string().optional(),
  controls: z.array(DetailControlSchema), // required
});

const RelationFieldInputOptionsSchema = z
  .object({
    sort: z.string().optional(),
    sortDir: z.enum(['asc', 'desc']).optional(), // default: 'asc'
    direction: z.string().optional(),
    displayKey: z.string().optional(),
    resource: z.string().optional(),
  })
  .catchall(z.unknown()); // arbitrary extra keys allowed (e.g. colspan, emitObject, values)

const FieldInputSchema = z.object({
  type: z.string().optional(), // required
  customRender: z.string().optional(),
  format: z.string().optional(), // 'relation' triggers relation handling; requires `resource`
  resource: z.string().optional(), // required when format === 'relation'
  relationType: RelationType.optional(), // auto-derived from the Zod model/sibling FK column if omitted
  position: z.number().optional(), // default: source order
  options: z.union([RelationFieldInputOptionsSchema, z.unknown()]).optional(),
  detail: DetailConfigSchema.optional(),
});

// ── Columns ───────────────────────────────────────────────────────────

const JsonColumnShape = {
  id: z.string(), // required in array form; implied by the map key in map form
  column: z.string().optional(), // default: same as `id`
  label: z.string().optional(), // default: title-cased version of `id`
  hiddenInTable: z.boolean().optional(), // default: false
  hiddenInForm: z.boolean().optional(), // default: false
  hiddenInView: z.boolean().optional(), // default: false
  sortable: z.boolean().optional(), // default: false
  defaultSort: z.boolean().optional(), // default: false
  searchable: z.boolean().optional(), // default: false
  filterable: z.boolean().optional(), // default: false
  createable: z.boolean().optional(), // default: true (only `false` excludes it)
  updateable: z.boolean().optional(), // default: true (only `false` excludes it)
  hideLabel: z.boolean().optional(), // default: false
  showWhen: WhenConditionSchema.optional(),
  hideWhen: WhenConditionSchema.optional(),
  disabledWhen: WhenConditionSchema.optional(),
  displayKey: z.string().optional(), // e.g. "author.name" for nested display
  sortId: z.string().optional(), // overrides the sort column
  enum: z.string().optional(), // name of a shared enum in crouton.enums.json
  idField: z.boolean().optional(), // default: false — exactly one column should set this
  showInLookup: z.boolean().optional(), // default: false
  columnType: z.string().optional(), // default: 'string'
  fieldInput: FieldInputSchema.optional(),
  extend: z.string().optional(), // path to another resource.json expanded as virtual sub-columns
  columns: z.record(z.string(), z.record(z.string(), z.unknown())).optional(), // per-sub-column overrides, only used with `extend`
};

const JsonColumnsMapSchema = z.record(
  z.string(),
  z.object(JsonColumnShape).omit({ id: true }).catchall(z.unknown()),
); // map form — key becomes `id`

const ColumnsSchema = JsonColumnsMapSchema;

// ── Calculated columns ──────────────────────────────────────────────

const CalculatedColumnSchema = z.object({
  id: z.string(), // required
  alias: z.string(), // required — must match `id`
  label: z.string().optional(),
  sqlExpression: z.string(), // required
  type: z.enum(['number', 'boolean', 'string']).optional(), // default: 'number'
  position: z.number().optional(),
  hiddenInTable: z.boolean().optional(), // default: false
  hiddenInView: z.boolean().optional(), // default: false
  fieldInput: z
    .object({
      position: z.number().optional(),
      options: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

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
