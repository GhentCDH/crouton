import { z } from 'zod';

import { FieldInputSchema } from './FieldInput.schema';
import { normalizeLabel } from '../schema/label.helper'; // ── Calculated columns ──────────────────────────────────────────────

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
    id: z.string().describe('Column identifier used in the response payload and UI schema.'),
    alias: z.string().describe('SQL alias for the subquery result — must match "id".'),
    label: z.string().optional().describe('Human-readable label shown in the table header. Defaults to a title-cased version of "id".'),
    sqlExpression: z.string().describe('Raw SQL subquery computing the column value. Use "main" as the alias for the parent table row, e.g. "SELECT COUNT(*) FROM child WHERE child.parent_id = main.id".'),
    type: z.enum(['number', 'boolean', 'string']).optional().describe('Cast type for the computed value. "number" (default) or "boolean" applies a SQL CAST; "string" skips it.'),
    position: z.number().optional().describe('Insertion position relative to other visible columns. Same semantics as fieldInput.position. Can also be set via fieldInput.position (takes precedence).'),
    hiddenInTable: z.boolean().optional().describe('When true, this column is hidden in the table view.'),
    hiddenInView: z.boolean().optional().describe('When true, this column is hidden in the detail view.'),
    fieldInput: FieldInputSchema.optional().describe('Rendering options for form/view schemas (colspan, format, etc). fieldInput.position takes precedence over the top-level position.'),
  })
  .transform(normalizeLabel);

export type CalculatedColumn = z.infer<typeof CalculatedColumnSchema>;
