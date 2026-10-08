import { z } from 'zod';

import { ColumnTypeSchema } from './ColumnType.schema';
import { FieldInputSchema, FieldVariantSchema } from './FieldInput.schema';

// -- Uniqueness ------------------------------------------------------------

/**
 * Rich form of `unique`. Lets a column be unique across a composite scope,
 * compared case-insensitively, and carry a custom violation message.
 */
export const UniqueConfigSchema = z.object({
  scope: z.array(z.string()).optional().describe('Other column ids the uniqueness is scoped by (composite unique constraint).'),
  caseInsensitive: z.boolean().optional().describe('When true, the uniqueness check is case-insensitive (maps to Prisma mode: "insensitive").'),
  message: z.string().optional().describe('Custom message shown on the field when the value is already taken.'),
});
export type UniqueConfig = z.infer<typeof UniqueConfigSchema>;

/** Declared uniqueness on a column: `true` for the simple case, or a config object. */
export const UniqueSchema = z.union([z.boolean(), UniqueConfigSchema]);
export type Unique = z.infer<typeof UniqueSchema>;

/** Uniqueness normalized to a single object shape consumed by API + form layers. */
export interface NormalizedUnique {
  enabled: boolean;
  scope?: string[];
  caseInsensitive?: boolean;
  message?: string;
}

/**
 * Collapse the boolean / object `unique` forms into one shape (or `undefined`
 * when uniqueness is off), so every consumer reads the same fields.
 */
export const normalizeUnique = (
  unique: Unique | undefined,
): NormalizedUnique | undefined => {
  if (!unique) return undefined;
  if (unique === true) return { enabled: true };
  return { enabled: true, ...unique };
};

// Used by showWhen / hideWhen / disabledWhen
export const WhenConditionSchema = z.object({
  field: z.string().describe('The other column id whose value is evaluated for the condition.'),
  eq: z.unknown().optional().describe('Show/hide/disable when the field value equals this value.'),
  neq: z.unknown().optional().describe('Show/hide/disable when the field value does NOT equal this value.'),
  exists: z.boolean().optional().describe('When true, show/hide/disable when the field has a non-empty value.'),
  notExists: z.boolean().optional().describe('When true, show/hide/disable when the field has no value.'),
});

// ── Columns ───────────────────────────────────────────────────────────

export const JsonColumnSchema = z.object({
  id: z.string().describe('Column identifier. In map form this is the map key; in array form it must be explicit. Must match the Prisma model field name exactly, unless overridden by "column".'),
  column: z.string().optional().describe('Prisma model field name. Defaults to "id" when omitted. Override when the resource key differs from the model field.'),
  label: z.string().optional().describe('Human-readable label shown in forms and table headers. Defaults to a title-cased version of "id".'),
  hiddenInTable: z.boolean().default(false).describe('When true, this column is not rendered in the list/table view.'),
  hiddenInForm: z.boolean().default(false).describe('When true, this column is not rendered in the create/edit form.'),
  hiddenInView: z.boolean().default(false).describe('When true, this column is not rendered in the read-only detail view.'),
  sortable: z.boolean().default(false).describe('Enables a sort toggle on the table column header.'),
  defaultSort: z.boolean().default(false).describe('When true, the table is sorted by this column by default. At most one column should set this.'),
  searchable: z.boolean().default(false).describe('Includes this field in global search queries.'),
  filterable: z.boolean().default(false).describe('Adds a filter control for this column in the table toolbar.'),
  createable: z.boolean().default(true).describe('When false, this column is excluded from the create form. Useful for system-managed fields.'),
  updateable: z.boolean().default(true).describe('When false, this column is excluded from the edit form after creation. Useful for immutable fields.'),
  hideLabel: z.boolean().default(false).describe('When true, the label is hidden in the form (useful for boolean toggles or when the context makes the label redundant).'),
  showWhen: WhenConditionSchema.optional().describe('Conditionally show this column in the form when the condition matches another field value.'),
  hideWhen: WhenConditionSchema.optional().describe('Conditionally hide this column in the form when the condition matches another field value.'),
  disabledWhen: WhenConditionSchema.optional().describe('Conditionally disable this column in the form when the condition matches another field value.'),
  displayKey: z.string().optional().describe('Dot-path to display a nested property (e.g. "author.name"). Used when the raw field value is an object.'),
  sortId: z.string().optional().describe('Overrides which field is sent to the API as the sort key (when the sort column differs from the display column).'),
  enum: z.string().optional().describe('Name of a shared enum in crouton.enums.json. At load time the loader injects the enum\'s { value, label }[] into fieldInput.options.values. Use this instead of duplicating the option list on each column.'),
  idField: z.boolean().default(false).describe('Marks this column as the primary-key field. Exactly one column per resource should set this to true.'),
  showInLookup: z.boolean().default(false).describe('When true, this column appears in autocomplete/lookup dropdowns referencing this resource.'),
  /**
   * Enforce that this column's value is unique across the resource. `true` is
   * simple single-column uniqueness; the object form allows a composite
   * `scope`, case-insensitive comparison, and a custom `message`.
   *
   * Requires a matching DB unique constraint (`@unique` in Prisma) to be
   * actually enforceable - the flag alone does not create one. The form uses it
   * to validate as-you-type against a lightweight check endpoint; the API maps
   * a Prisma unique violation back to this field on write.
   */
  unique: UniqueSchema.optional().describe('Enforce that this column\'s value is unique. true = simple single-column uniqueness; object form allows composite scope, case-insensitive comparison, and a custom message. Requires a matching DB @unique constraint.'),
  /**
   * Data type of the column, as a shorthand name (`"string"`, `"integer"`, …)
   * or a full JSON Schema fragment:
   *
   * ```json
   * "type": {
   *   "type": "object",
   *   "properties": { "id": { "type": "string" }, "name": { "type": "string" } }
   * }
   * ```
   *
   * Required on every column of a `kind: "custom"` resource, where it is the
   * only source of the resource's json_schema. Optional on a `prisma`
   * resource, whose schema is derived from the Zod model.
   */
  type: ColumnTypeSchema.optional().describe('Data type of the column. A shorthand string ("string", "integer", "boolean", "date", "date-time", "number", "object", "array") or a JSON Schema fragment. Required on every column of a kind:"custom" resource. On a "prisma" resource this overrides the Prisma-derived type.'),
  /**
   * Whether the form requires a value.
   *
   * A prisma resource derives `required` from its Zod model, so this is an
   * override in either direction: `true` adds the column to the form schema's
   * `required` array, `false` removes it, and omitting it leaves the model's
   * answer alone. A `kind: "custom"` resource has no model, so this is the only
   * way to mark one of its fields required.
   *
   * Applies to the **form** view only — a required filter input would make the
   * filter panel unsubmittable, and the table and view schemas are read-only.
   * Ignored on the id column and on columns that are neither createable nor
   * updateable, since the form cannot supply a value for those.
   */
  required: z.boolean().optional().describe('Whether the form requires a value. On a "prisma" resource this overrides the Prisma-derived required state; on "custom" resources it is the only way to mark a field required. Applies to forms only.'),
  /**
   * @deprecated Use `type` instead. Retained because it is still consumed by
   * the boolean predicate and the schema-less sub-resource view builder.
   */
  columnType: z.string().default('string').describe('@deprecated — use "type" instead.'),
  fieldInput: FieldInputSchema.optional().describe('Configures the UI control used in create/edit forms and the display format. Use "type" to pick the input widget; "format" to pick a special renderer (e.g. "relation").'),
  fieldView: FieldVariantSchema.optional().describe('Per-context override for the read-only detail view. Same shape as fieldInput; only the keys you provide are overridden. Falls back to fieldInput.'),
  fieldTable: FieldVariantSchema.optional().describe('Per-context override for the table cell renderer. Same shape as fieldInput; only the keys you provide are overridden. Falls back to fieldView, then fieldInput.'),
  /**
   * Path to another `resource.json` whose columns are expanded as nested sub-columns
   * under this column's object key.
   *
   * Example: `"extend": "../internalAuthor/resource.json"` on a column `author`
   * auto-generates virtual sub-columns like `author_name` (column: "author", displayKey: "name").
   *
   * Visibility (`hiddenInTable/Form/View`) on this column is inherited by all sub-columns as a
   * default; the referenced resource's own column visibility further restricts it.
   */
  extend: z.string().optional().describe('Relative path to another resource.json whose columns are expanded as virtual sub-columns under this column key. Example: "../author/resource.json" on a column "author" generates columns like "author_name".'),
  columns: z.record(z.string(), z.record(z.string(), z.unknown())).optional().describe('Per-sub-column overrides when using "extend". Key is the virtual column id ("{extendId}_{refColId}") or the referenced column id. Value is any JsonColumn fields to merge.'),
});

export type JsonColumn = z.infer<typeof JsonColumnSchema>;
export type JsonColumnInput = z.input<typeof JsonColumnSchema>;
