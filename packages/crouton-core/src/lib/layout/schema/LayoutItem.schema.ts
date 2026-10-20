import { z } from 'zod';

export const WhenConditionSchema = z.object({
  field: z
    .string()
    .describe(
      'The other column id whose value is evaluated for the condition.',
    ),
  eq: z
    .unknown()
    .optional()
    .describe('Show/hide/disable when the field value equals this value.'),
  neq: z
    .unknown()
    .optional()
    .describe(
      'Show/hide/disable when the field value does NOT equal this value.',
    ),
  exists: z
    .boolean()
    .optional()
    .describe(
      'When true, show/hide/disable when the field has a non-empty value.',
    ),
  notExists: z
    .boolean()
    .optional()
    .describe('When true, show/hide/disable when the field has no value.'),
});

export type WhenCondition = z.infer<typeof WhenConditionSchema>;

export const _LayoutFieldControlSchema = z.object({
  id: z.string().describe('Column id this control is bound to.'),
  colspan: z.number().int().min(1).max(12).default(12).describe('Number of grid columns this control spans (1–12). Defaults to full width.'),
  rowspan: z.number().int().min(1).max(6).default(1).describe('Number of grid rows this control spans (1–6). Defaults to 1.'),
  width: z.string().default('full').describe('Tailwind width class applied to the input wrapper (e.g. "w-48", "full"). Defaults to full width.'),
  label: z.string().optional().describe('Override the column label shown above the input.'),
  hideLabel: z.boolean().default(false).optional().describe('Hide the label above the input.'),
  type: z.string().optional().describe('Override the field input type (e.g. "text", "select").'),
  options: z.record(z.string(), z.unknown()).optional().describe('Field input options passed to the renderer.'),
  showWhen: WhenConditionSchema.optional().describe(
    'Conditionally show this control when the condition matches another field value.',
  ),
  hideWhen: WhenConditionSchema.optional().describe(
    'Conditionally hide this control when the condition matches another field value.',
  ),
  disabledWhen: WhenConditionSchema.optional().describe(
    'Conditionally disable this control when the condition matches another field value.',
  ),
});

/** A field entry in a layout `items` list: a bare column id or a field config object. */
export const LayoutFieldItemSchema = z.union([
  z.string(),
  _LayoutFieldControlSchema,
]);

/** A component slot in a layout `items` list. */
export const LayoutComponentItemSchema = z.object({
  component: z.string().describe('Name of the Vue component to render in this slot.'),
  colspan: z.number().int().min(1).max(12).default(12).describe('Number of grid columns this slot spans (1–12). Defaults to full width.'),
  rowspan: z.number().int().min(1).max(6).default(1).describe('Number of grid rows this slot spans (1–6). Defaults to 1.'),
  width: z.string().default('full').describe('Tailwind width class applied to the slot wrapper. Defaults to full width.'),
  label: z.string().optional().describe('Optional label rendered above the component slot.'),
});

// ── Legacy aliases (kept for backward compat with existing consumers) ────

/** @deprecated Use `LayoutFieldItemSchema` */
export const LayoutFieldControlSchema = LayoutFieldItemSchema;

/** @deprecated Use `LayoutComponentItemSchema` */
export const LayoutComponentSchema = LayoutComponentItemSchema;

export const LayoutControlSchema = z.union([
  LayoutFieldItemSchema,
  LayoutComponentItemSchema,
]);

export type LayoutControl = z.infer<typeof LayoutControlSchema>;

// ── Item kind guards ────────────────────────────────────────────────────

export const isFieldIdItem = (item: unknown): item is string =>
  typeof item === 'string';

export const isFieldControlItem = (
  item: unknown,
): item is z.infer<typeof _LayoutFieldControlSchema> =>
  typeof item === 'object' && item !== null && 'id' in item;

export const isComponentItem = (
  item: unknown,
): item is z.infer<typeof LayoutComponentItemSchema> =>
  typeof item === 'object' && item !== null && 'component' in item;

export const isNodeItem = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' &&
  item !== null &&
  !('id' in item) &&
  !('component' in item);

export const resolveItemFieldId = (
  item: z.infer<typeof LayoutFieldItemSchema>,
): string => (typeof item === 'string' ? item : item.id);

/** @deprecated Use `isComponentItem` */
export const isComponentControl = (
  ctrl: LayoutControl,
): ctrl is z.infer<typeof LayoutComponentItemSchema> =>
  isComponentItem(ctrl);
