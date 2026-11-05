import { z } from 'zod';
// ── Table-level (global) actions ────────────────────────────────────

// Used by row-action / table-action `condition`
const ActionConditionSchema = z.object({
  field: z.string().describe('Row field name to evaluate for the condition.'),
  op: z
    .enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists', 'notExists'])
    .default('eq')
    .describe('Comparison operator. "eq"/"neq" for equality, "gt"/"gte"/"lt"/"lte" for numeric/date, "exists"/"notExists" for null checks. Defaults to "eq".'),
  value: z.unknown().optional().describe('Comparison value. Not required for "exists" or "notExists" operators.'),
});

const ActionSchema = z.object({
  type: z.string().describe('Action type discriminator. Use "procedure" for backend calls or "link" for URL navigation.'),
  id: z.string().describe('Unique identifier for the action, used as the button key and endpoint name.'),
  label: z.string().describe('Human-readable button label shown in the UI.'),
  icon: z.string().optional().describe('MDI icon name (e.g. "mdi:open-in-new"). Shown on the action button.'),
  tooltip: z.string().optional().describe('Tooltip text on hover. Defaults to the label.'),
  condition: ActionConditionSchema.optional().describe('Optional condition evaluated per row. Button is hidden when the condition is false.'),
});

type Action = z.infer<typeof ActionSchema>;

export const JsonProcedureActionSchema = ActionSchema.extend({
  type: z.literal('procedure').default('procedure').describe('Action type: "procedure" triggers a backend call to the resource\'s actions/ directory.'),
  procedure: z.string().describe('Filename (without extension) inside the resource\'s actions/ directory that exports the procedure handler (e.g. "syncZotero").'),
  method: z.string().optional().default('post').describe('HTTP method for the frontend request. Defaults to "post".'),
  data: z.record(z.string(), z.unknown()).optional().describe('Static query or body params passed to the procedure endpoint.'),
});

export const JsonLinkActionSchema = ActionSchema.extend({
  type: z.literal('link').default('link').describe('Action type: "link" opens a URL in a new browser tab without a backend call.'),
  href: z.string().describe('URL to open. May contain {env.VAR} placeholders substituted at runtime.'),
  blank: z.boolean().optional().default(true).describe('When true (default), the link opens in a new browser tab.'),
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
