import { z } from 'zod';

import { FieldInputSchema } from './FieldInput.schema'; // ── Calculated columns ──────────────────────────────────────────────

/**
 * A column whose value is computed by a raw SQL subquery at query time.
 * The `sqlExpression` may reference the parent table via the alias `main`.
 *
 * Example:
 * ```json
 * {
 *   "id": "inception",
 *   "alias": "inception",
 *   "label": "Available in inception",
 *   "sqlExpression": "SELECT COUNT(id) FROM text_content WHERE text_content.text_id = main.id",
 *   "position": 8
 * }
 * ```
 */
export const CalculatedColumnSchema = z
  .object({
    /** Column identifier used in the response payload and UI schema. */
    id: z.string(), // required
    /** SQL alias — must match `id`. */
    alias: z.string(), // required — must match `id`
    /** Human-readable label shown in the table header. */
    label: z.string().optional() /**
     * Raw SQL subquery. Use `main` as the alias for the parent table row,
     * e.g. `SELECT COUNT(*) FROM child WHERE child.parent_id = main.id`.
     */,
    sqlExpression: z.string(), // required
    /** JSON schema / cast type for the computed value. Defaults to `"number"`. `"string"` skips CAST. */
    type: z.enum(['number', 'boolean', 'string']).optional(), // default: 'number'
    /**
     * Insertion position relative to the other visible columns.
     * Uses the same semantics as `fieldInput.position` on regular columns:
     * `position: N` places this column before the element currently at index N.
     * Can also be set via `fieldInput.position` (takes precedence).
     */
    position: z.number().optional(),
    hiddenInTable: z.boolean().optional(), // default: false
    hiddenInView: z.boolean().optional(), // default: false
    /**
     * Field input options for rendering in form / view schemas.
     * Supports `colspan`, `format`, and any other options passed to the Control renderer.
     * `position` here takes precedence over the top-level `position`.
     */
    fieldInput: FieldInputSchema.optional(),
  })
  .transform((d) => {
    return {
      label: d.id,
      ...d,
    };
  });

export type CalculatedColumn = z.infer<typeof CalculatedColumnSchema>;
