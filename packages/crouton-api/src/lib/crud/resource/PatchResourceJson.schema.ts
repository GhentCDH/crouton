import { z } from 'zod';

/**
 * A per-context field-variant patch (`fieldInput`/`fieldView`/`fieldTable`).
 * Mirrors crouton-core's `FieldVariantSchema` shape loosely — `options` is a
 * catchall since a column's real option set depends on its `format`/`type`
 * (relation vs. plain vs. custom render) and the visual builder can't know
 * that ahead of time.
 *
 * Every key accepts `null`, matching `mergeFieldVariant`'s (crouton-core)
 * "a `null` value deletes an inherited key" convention — this is how the
 * editor's "reset to inherited" action works: it sends `null` for a key so
 * the column falls back to whatever the level below it (`fieldView` →
 * `fieldInput`, or `fieldTable` → `fieldView` → `fieldInput`) resolves to,
 * rather than pinning a copy of the resolved value at this level.
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
 * visibility (`hiddenInTable/Form/View`), and the three field-variant
 * patches. Adding/removing columns is still out of scope — see
 * `FIELD_VARIANTS_EDITOR_PLAN.md`.
 */
export const PatchColumnSchema = z
  .object({
    label: z.string().optional(),
    column: z.string().optional(),
    hiddenInTable: z.boolean().optional(),
    hiddenInForm: z.boolean().optional(),
    hiddenInView: z.boolean().optional(),
    fieldInput: FieldVariantPatchSchema.optional(),
    fieldView: FieldVariantPatchSchema.optional(),
    fieldTable: FieldVariantPatchSchema.optional(),
  })
  .partial();

export type PatchColumn = z.infer<typeof PatchColumnSchema>;

export const PatchResourceJsonSchema = z.object({
  columns: z.record(z.string(), PatchColumnSchema),
});

export type PatchResourceJson = z.infer<typeof PatchResourceJsonSchema>;
