import { z } from 'zod';

import { normalizeLabel } from '../schema/label.helper'; // ── Calculated columns ──────────────────────────────────────────────
import { FieldInputSchema } from './FieldInput.schema';

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
 *   "sqlExpression": "SELECT COUNT(id) FROM text_content WHERE text_content.text_id = main.id"
 * }
 * ```
 */
export const CalculatedColumnSchema = z
  .object({
    id: z.string().describe('Column identifier used in the response payload and UI schema.'),
    alias: z.string().describe('SQL alias for the subquery result — must match "id".'),
    label: z.string().optional().describe('Human-readable label shown in the table header. Defaults to a title-cased version of "id".'),
    sqlExpression: z.string().describe('Raw SQL subquery computing the column value. Use "main" as the alias for the parent table row, e.g. "SELECT COUNT(*) FROM child WHERE child.parent_id = main.id".'),
    type: z.enum(['number', 'boolean', 'string']).optional().describe('Cast type for the computed value. "number" (default) or "boolean" applies a SQL CAST; "string" skips it.'),
    fieldInput: FieldInputSchema.optional().describe('Rendering options for form/view schemas (format, options, etc).'),
  })
  .transform(normalizeLabel);

export type CalculatedColumn = z.infer<typeof CalculatedColumnSchema>;
