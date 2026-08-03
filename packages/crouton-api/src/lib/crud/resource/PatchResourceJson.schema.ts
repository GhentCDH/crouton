import { z } from 'zod';

/**
 * Request body for `PATCH <route>/resource.json` — the visual resource
 * builder's edit endpoint (dev-mode only, see `dev-mode.ts`).
 *
 * Deliberately narrow for the MVP: only the display attributes the visual
 * builder exposes can be patched (label/column/visibility/position/colspan).
 * Adding/removing columns, changing `fieldInput.type`, or editing relations
 * is out of scope — see `VISUAL_RESOURCE_BUILDER_PLAN.md`.
 */
export const PatchColumnSchema = z
  .object({
    label: z.string().optional(),
    column: z.string().optional(),
    hiddenInTable: z.boolean().optional(),
    hiddenInForm: z.boolean().optional(),
    hiddenInView: z.boolean().optional(),
    fieldInput: z
      .object({
        position: z.number().optional(),
        options: z
          .object({
            colspan: z.number().min(1).max(4).optional(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .optional(),
  })
  .partial();

export type PatchColumn = z.infer<typeof PatchColumnSchema>;

export const PatchResourceJsonSchema = z.object({
  columns: z.record(z.string(), PatchColumnSchema),
});

export type PatchResourceJson = z.infer<typeof PatchResourceJsonSchema>;
