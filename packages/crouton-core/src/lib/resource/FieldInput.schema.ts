import { z } from 'zod';

export const RelationType = z.enum([
  'oneToOne',
  'manyToOne',
  'oneToMany',
  'manyToMany',
]);
export type RelationType = z.infer<typeof RelationType>;

export const DetailControlSchema = z.object({
  property: z.string(), // required
  type: z.string().optional(), // default: 'text'
  options: z.record(z.string(), z.unknown()).optional(),
  hideLabel: z.boolean().optional(), // default: false
  width: z.string().optional(),
});

export type DetailControl = z.infer<typeof DetailControlSchema>;

export const DetailConfigSchema = z.object({
  layout: z.enum(['collapse', 'row']), // required
  titleKey: z.string().optional(),
  controls: z.array(DetailControlSchema), // required
});

export type DetailConfig = z.infer<typeof DetailConfigSchema>;

/**
 * Options for relation field inputs (`fieldInput.format === "relation"`).
 * These are injected into the frontend control and — for `sort`/`sortDir` —
 * also used by the backend to apply `orderBy` on included relation records.
 */
export const RelationFieldInputOptionsSchema = z
  .object({
    /** Field to sort related records by, e.g. `"title"` or `"author.name"`. */
    sort: z.string().optional(),
    /** Sort direction. Defaults to `"asc"` when omitted. */
    sortDir: z.enum(['asc', 'desc']).optional(), // default: 'asc'
    /** CSS flex direction for the relation control button layout. */
    direction: z.string().optional(),
    /** Key used as the display label in the relation control. */
    displayKey: z.string().optional(),
    /** Path to the related resource (resolved to a URI at load time). */
    resource: z.string().optional(),
  })
  .catchall(z.unknown()); // arbitrary extra keys allowed (e.g. colspan, emitObject, values)

export type RelationFieldInputOptions = z.infer<
  typeof RelationFieldInputOptionsSchema
>;
export const FieldInputSchema = z.object({
  type: z.string().optional(),
  customRender: z.string().optional(),

  /**
   * Render format hint for the frontend (e.g. `"relation"` for sub-resource
   * relations). When `format` is `"relation"`, `resource` must also be set.
   */
  format: z.string().optional(), // 'relation' triggers relation handling; requires `resource`
  /**
   * Relative path to the child resource definition, e.g. `"./author.resource"`.
   * Only used when `format` is `"relation"`. Resolved at load time to inject
   * sub-resource URIs into `options`.
   */
  resource: z.string().optional(), // required when format === 'relation'
  /**
   * Cardinality of the relation. Used by the frontend to determine the correct
   * renderer and behaviour (e.g. single-select vs multi-select).
   * - `manyToOne` / `oneToOne`   — single FK reference (autocomplete / relation control)
   * - `oneToMany` / `manyToMany` — collection (sub-resource table / multi-select)
   */
  relationType: RelationType.optional(), // auto-derived from the Zod model/sibling FK column if omitted
  /** Override the display order in form views. Lower values come first. */
  position: z.number().optional(), // default: source order
  options: z.union([RelationFieldInputOptionsSchema, z.unknown()]).optional(),
  /** Nested array detail layout (renders via `detailFixed`). */
  detail: DetailConfigSchema.optional(),
});

export type FieldInput = z.infer<typeof FieldInputSchema>;
