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
  id: z.string(),
  colspan: z.number().int().min(1).max(12).optional(),
  rowspan: z.number().int().min(1).max(6).optional(),
  width: z.string().optional(),
  label: z.string().optional(),
  hideLabel: z.boolean().optional(),
  type: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
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

export const LayoutFieldControlSchema = z.union([
  z.string(),
  _LayoutFieldControlSchema,
]);

export const LayoutComponentSchema = z.object({
  component: z.string(),
  colspan: z.number().int().min(1).max(12).optional(),
  rowspan: z.number().int().min(1).max(6).optional(),
  width: z.string().optional(),
  label: z.string().optional(),
});

export const LayoutControlSchema = z.union([
  LayoutFieldControlSchema,
  LayoutComponentSchema,
]);

export type LayoutControl = z.infer<typeof LayoutControlSchema>;

export const isComponentControl = (
  ctrl: LayoutControl,
): ctrl is z.infer<typeof LayoutComponentSchema> =>
  typeof ctrl !== 'string' && 'component' in ctrl;
