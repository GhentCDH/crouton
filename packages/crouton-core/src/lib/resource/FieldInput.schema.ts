import { z } from 'zod';

import { fieldInputRegistry } from './field-input/registry';
import { RelationOptionsSchema } from './field-input/types/relation.options';

export { RelationOptionsSchema as RelationFieldInputOptionsSchema } from './field-input/types/relation.options';
export type { RelationOptions as RelationFieldInputOptions } from './field-input/types/relation.options';

export const RelationType = z.enum([
  'oneToOne',
  'manyToOne',
  'oneToMany',
  'manyToMany',
]);
export type RelationType = z.infer<typeof RelationType>;

export const DetailControlSchema = z.object({
  property: z.string().describe('Field property key within the array item object.'),
  type: z.string().optional().describe('Renderer type for this detail control. Defaults to "text".'),
  options: z.record(z.string(), z.unknown()).optional().describe('Renderer-specific options for this control.'),
  hideLabel: z.boolean().optional().describe('When true, the label is hidden for this control.'),
  width: z.string().optional().describe('CSS width of this control in the detail layout (e.g. "200px" or "30%").'),
});

export type DetailControl = z.infer<typeof DetailControlSchema>;

export const DetailConfigSchema = z.object({
  layout: z.enum(['collapse', 'row']).describe('Layout style for the nested array detail. "collapse" shows items in a collapsible section; "row" shows them inline.'),
  titleKey: z.string().optional().describe('Property key used as the heading for each array item in "collapse" mode.'),
  controls: z.array(DetailControlSchema).describe('Controls to render for each array item. Each control maps to a property of the item object.'),
});

export type DetailConfig = z.infer<typeof DetailConfigSchema>;
export const FieldInputSchema = z.object({
  $schema: z.string().optional().describe('JSON Schema URL for this field-input options block. Enables editor autocomplete for type-specific options.'),
  type: z.string().optional().describe(
    'Field input type — determines which renderer and options schema apply. ' +
    'Known values: "string" (text), "textarea" (multi-line text), "markdown" (markdown editor), ' +
    '"number" (decimal), "Integer" (whole number), "boolean" (checkbox), "toggle" (toggle switch), ' +
    '"select" (single-select dropdown), "multiSelect" (multi-select), "autocomplete" (relation lookup), ' +
    '"date" (date picker), "dateTime" (date+time picker), "date-range" (date range), ' +
    '"relation" (sub-resource table), "array" (array editor), "custom" (custom renderer). ' +
    'Use "fieldInput.type" to override the display format derived from "columns[*].format".',
  ),
  customRender: z.string().optional().describe('Import path to a custom Vue component used as the field renderer. Only used when type is "custom".'),

  format: z.string().optional().describe('Render format hint for the frontend. Use "relation" for sub-resource relations (requires "resource"). The display format; determines which field input is used. Use "fieldInput.type" to override.'),
  resource: z.string().optional().describe('Relative path to the child resource definition (e.g. "./author.resource"). Required when format is "relation". Resolved at load time to inject sub-resource URIs into options.'),
  relationType: RelationType.optional().describe(
    'Cardinality of the relation. ' +
    '"manyToOne" or "oneToOne" — single FK reference rendered as autocomplete or relation control. ' +
    '"oneToMany" or "manyToMany" — collection rendered as a sub-resource table or multi-select. ' +
    'Auto-derived from the Zod model or a sibling FK column when omitted.',
  ),
  foreignKey: z.string().optional().describe('FK field on the child model pointing back to the parent (e.g. "workId"). Defaults to "${parentModel}Id".'),
  relation: z.string().optional().describe('Override the Prisma relation field name when it differs from the column id.'),
  position: z.number().optional().describe('Override the display order in form views. Lower values come first. Defaults to source order.'),
  /**
   * Value to pre-fill this field with on the create form. Injected into the
   * generated form view's JSON Schema as `properties[id].default`, which
   * `parseValue({})` (see `@ghentcdh/crouton-vue`'s `form-def.ts`) applies when
   * opening a blank record. Not applicable to `format: "relation"` fields —
   * relation columns are excluded from the picked data schema entirely.
   *
   * Supports dynamic default tokens evaluated at form-open time:
   * - `"$now"` — current datetime ISO string
   * - `"$today"` — current date ISO string (date only, e.g. `"2025-03-14"`)
   * - `"$user"` — current user object (requires `defaults: { '$user': ... }` on `CroutonPlugin` config, or `useCrouton().setDefault('$user', ...)`)
   */
  defaultValue: z.unknown().optional().describe('Value to pre-fill this field with on the create form. Supports dynamic tokens: "$now" (current datetime), "$today" (current date), "$user" (current user object). Not applicable to format:"relation" fields.'),
  options: z.union([RelationOptionsSchema, z.unknown()]).optional().describe('Type-specific options for the field input. Shape depends on "type" — see the field-input-specific JSON Schema ($schema) for the full options contract.'),
  detail: DetailConfigSchema.optional().describe('Nested array detail layout configuration. Renders via the detailFixed renderer.'),
});

export type FieldInput = z.infer<typeof FieldInputSchema>;

/** Parse fieldInput.options through the per-type Zod schema (applies coercion and defaults). */
export const parseFieldInputOptions = (fi: FieldInput): FieldInput => {
  if (!fi.type || fi.options == null) return fi;
  const def = fieldInputRegistry.get(fi.type);
  if (!def) return fi;
  const result = def.options.safeParse(fi.options);
  return result.success ? { ...fi, options: result.data } : fi;
};

/**
 * A per-context override of a column's field config. Structurally identical to
 * {@link FieldInputSchema} — every key is optional — so a variant can override
 * just what it needs (typically a single `options` key) and inherit the rest
 * from the level below it via {@link mergeFieldVariant}.
 */
export const FieldVariantSchema = FieldInputSchema;
export type FieldVariant = z.infer<typeof FieldVariantSchema>;

/** Drop keys whose value is explicitly `null` (used to "delete" an inherited key). */
const stripNull = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null) out[k] = v;
  return out;
};

/**
 * Layer a variant over a base field config (deep-merge, one level into `options`).
 *
 * - `override` wins key-by-key; `base` supplies everything the override omits.
 * - `options` is merged one level deep so a variant can tweak `options.display`
 *   without repeating `format`, `resource`, `relationType`, etc.
 * - a `null` value in the override deletes that inherited key (top-level or in
 *   `options`).
 *
 * Returns `base` unchanged when there is no override, and `override` when there
 * is no base — so `mergeFieldVariant(x, undefined) === x`.
 */
export const mergeFieldVariant = (
  base: FieldInput | undefined,
  override: FieldVariant | undefined,
): FieldInput | undefined => {
  if (!base) return override;
  if (!override) return base;

  const merged = stripNull({ ...base, ...override }) as FieldInput;

  if (base.options || override.options) {
    const mergedOptions = stripNull({
      ...(base.options as Record<string, unknown> | undefined),
      ...(override.options as Record<string, unknown> | undefined),
    });
    merged.options = mergedOptions;
  }

  return merged;
};
