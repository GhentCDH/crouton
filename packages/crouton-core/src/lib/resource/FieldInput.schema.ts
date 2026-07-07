import { z } from 'zod';

export const RelationType = z.enum([
  'oneToOne',
  'manyToOne',
  'oneToMany',
  'manyToMany',
]);

export const DetailControlSchema = z.object({
  property: z.string(), // required
  type: z.string().optional(), // default: 'text'
  options: z.record(z.string(), z.unknown()).optional(),
  hideLabel: z.boolean().optional(), // default: false
  width: z.string().optional(),
});

export const DetailConfigSchema = z.object({
  layout: z.enum(['collapse', 'row']), // required
  titleKey: z.string().optional(),
  controls: z.array(DetailControlSchema), // required
});

export const RelationFieldInputOptionsSchema = z
  .object({
    sort: z.string().optional(),
    sortDir: z.enum(['asc', 'desc']).optional(), // default: 'asc'
    direction: z.string().optional(),
    displayKey: z.string().optional(),
    resource: z.string().optional(),
  })
  .catchall(z.unknown()); // arbitrary extra keys allowed (e.g. colspan, emitObject, values)

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
