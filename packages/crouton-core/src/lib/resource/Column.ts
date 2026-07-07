import { z } from 'zod';
import { FieldInputSchema } from './FieldInput.schema';

// Used by showWhen / hideWhen / disabledWhen
export const WhenConditionSchema = z.object({
  field: z.string(), // required
  eq: z.unknown().optional(),
  neq: z.unknown().optional(),
  exists: z.boolean().optional(),
  notExists: z.boolean().optional(),
});

// ── Columns ───────────────────────────────────────────────────────────

export const JsonColumnShape = z.object({
  id: z.string(), // required in array form; implied by the map key in map form
  column: z.string().optional(), // default: same as `id`
  label: z.string().optional(), // default: title-cased version of `id`
  hiddenInTable: z.boolean().default(false), // default: false
  hiddenInForm: z.boolean().default(false), // default: false
  hiddenInView: z.boolean().default(false), // default: false
  sortable: z.boolean().default(false), // default: false
  defaultSort: z.boolean().default(false), // default: false
  searchable: z.boolean().default(false), // default: false
  filterable: z.boolean().default(false), // default: false
  createable: z.boolean().default(true), // default: true (only `false` excludes it)
  updateable: z.boolean().default(true), // default: true (only `false` excludes it)
  hideLabel: z.boolean().default(false), // default: false
  showWhen: WhenConditionSchema.optional(),
  hideWhen: WhenConditionSchema.optional(),
  disabledWhen: WhenConditionSchema.optional(),
  displayKey: z.string().optional(), // e.g. "author.name" for nested display
  sortId: z.string().optional(), // overrides the sort

  /**
   * Name of a shared enum in the project enum registry (`crouton.enums.json`).
   * At load time the loader injects that enum's `{ value, label }[]` into
   * `fieldInput.options.values`, so columns don't duplicate the option list.
   */
  enum: z.string().optional(), // name of a shared enum in crouton.enums.json
  idField: z.boolean().default(false), // default: false — exactly one column should set this
  showInLookup: z.boolean().default(false), // default: false
  columnType: z.string().default('string'), // default: 'string'
  fieldInput: FieldInputSchema.optional(),
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
  extend: z.string().optional(), // path to another resource.json expanded as virtual sub-columns
  /**
   * Per-sub-column overrides when using `extend`.
   * Key: the virtual column id (`"{extendId}_{refColId}"`) or just the referenced column id.
   * Value: any `JsonColumn` fields to merge over the generated virtual column.
   */
  columns: z.record(z.string(), z.record(z.string(), z.unknown())).optional(), // per-sub-column overrides, only used with `extend`
});

export type JsonColumn = z.infer<typeof JsonColumnShape>;

export const transformColumn = (c: JsonColumn) => {
  return {
    column: c.id,
    title: c.id, // TODO title-cased version of id
    ...c,
  };
};
