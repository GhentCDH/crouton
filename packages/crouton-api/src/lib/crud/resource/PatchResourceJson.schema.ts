import { z } from 'zod';

/**
 * A per-context field-variant patch (`fieldInput`).
 * `options` is a catchall since a column's real option set depends on its
 * `format`/`type` and the visual builder can't know that ahead of time.
 *
 * Every key accepts `null` — the editor's "reset to inherited" action sends
 * `null` for a key so the column falls back to `fieldInput`.
 */
const FieldVariantPatchSchema = z
  .object({
    type: z.string().nullable().optional(),
    format: z.string().nullable().optional(),
    resource: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    options: z.record(z.string(), z.unknown().nullable()).optional(),
  })
  .partial();

export type FieldVariantPatch = z.infer<typeof FieldVariantPatchSchema>;

/**
 * Request body for `PATCH <route>/resource.json` — the visual resource
 * builder's edit endpoint (dev-mode only, see `dev-mode.ts`).
 *
 * Covers the display attributes the visual builder exposes: label/column,
 * visibility (`hiddenInTable/Form/View`), and the fieldInput patch.
 * Adding/removing columns is still out of scope — see `FIELD_VARIANTS_EDITOR_PLAN.md`.
 */
export const PatchColumnSchema = z
  .object({
    label: z.string().optional(),
    column: z.string().optional(),
    hiddenInTable: z.boolean().optional(),
    hiddenInForm: z.boolean().optional(),
    hiddenInView: z.boolean().optional(),
    fieldInput: FieldVariantPatchSchema.optional(),
  })
  .partial();

export type PatchColumn = z.infer<typeof PatchColumnSchema>;

export const PatchResourceJsonSchema = z.object({
  columns: z.record(z.string(), PatchColumnSchema),
});

export type PatchResourceJson = z.infer<typeof PatchResourceJsonSchema>;
