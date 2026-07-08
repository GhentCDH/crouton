import { z } from 'zod';
// ── Table-level (global) actions ────────────────────────────────────

// Used by row-action / table-action `condition`
const ActionConditionSchema = z.object({
  /** Row field to evaluate. */
  field: z.string(), //
  /**
   * Comparison operator. Defaults to `"eq"`.
   * - `eq` / `neq`         — strict equality
   * - `gt` / `gte` / `lt` / `lte` — numeric or date comparison
   * - `exists`             — field is not null / undefined / empty string
   * - `notExists`          — field is null / undefined / empty string
   */
  op: z
    .enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists', 'notExists'])
    .default('eq'), // default: 'eq'
  /** Comparison value. Not required for `exists` / `notExists`. */
  value: z.unknown().optional(), // not required for exists/notExists
});

const ActionSchema = z.object({
  type: z.string(),
  /** Unique identifier for the action. */
  id: z.string(), // required
  /** Human-readable button label. */
  label: z.string(),
  /** MDI icon name, e.g. `"mdi:open-in-new"`. */
  icon: z.string().optional(),
  /** Tooltip text. Falls back to `label` when omitted. */
  tooltip: z.string().optional(), // default: falls back to `label`
  condition: ActionConditionSchema.optional(),
});

type Action = z.infer<typeof ActionSchema>;

export const JsonProcedureActionSchema = ActionSchema.extend({
  type: z.literal('procedure').default('procedure'), // default: 'procedure'
  /**
   * Filename (without extension) inside the resource's `actions/` directory
   * that exports the table-action procedure, e.g. `"syncZotero"`.
   */
  procedure: z.string(), // required
  /** HTTP method for the frontend. Defaults to `"post"`. */
  method: z.string().optional().default('post'), // default: 'post'
  /** Static query / body params passed to the endpoint. */
  data: z.record(z.string(), z.unknown()).optional(),
});

/** Action that opens a URL in a new browser tab — no backend call. */
export const JsonLinkActionSchema = ActionSchema.extend({
  /** Optional condition evaluated per row. Button is hidden when the condition is false. */
  type: z.literal('link').default('link'), // required
  /** URL to open. May contain `{env.VAR}` placeholders. */
  href: z.string(), // required
});

const transformAction = <A extends Action>(action: A) => {
  const label = action.label;

  return {
    tooltip: label,
    ...action,
  };
};

export const JsonActionSchema = z
  .union([JsonProcedureActionSchema, JsonLinkActionSchema])
  .transform(transformAction);

export type JsonActionCondition = z.infer<typeof ActionConditionSchema>;
export type JsonAction = z.infer<typeof JsonActionSchema>;
export type JsonLinkAction = z.infer<typeof JsonLinkActionSchema>;
export type JsonProcedureAction = z.infer<typeof JsonProcedureActionSchema>;
