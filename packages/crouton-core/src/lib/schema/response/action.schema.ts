import { z } from 'zod';

const ActionConditionSchema = z.object({
  field: z.string(),
  op: z
    .enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists', 'notExists'])
    .optional()
    .default('eq'),
  value: z.unknown().optional(),
});

export const LinkActionSchema = z.object({
  type: z.literal('link'),
  id: z.string(),
  label: z.string().optional(),
  href: z.string(),
  blank: z.boolean().optional().default(true),
  icon: z.string().optional(),
  tooltip: z.string().optional(),
  condition: ActionConditionSchema.optional(),
});

export const ProcedureActionSchema = z.object({
  type: z.literal('procedure').optional().default('procedure'),
  id: z.string(),
  label: z.string().optional(),
  uri: z.string(),
  method: z.string().optional().default('post'),
  data: z.any().optional(),
  icon: z.string().optional(),
  tooltip: z.string().optional(),
  condition: ActionConditionSchema.optional(),
});

export const ActionSchema = z.union([LinkActionSchema, ProcedureActionSchema]);

export type Action = z.infer<typeof ActionSchema>;

/** Schema for a single table-level (global) action — no record id, no condition. */
export const TableActionSchema = z.union([
  LinkActionSchema.omit({ condition: true }),
  ProcedureActionSchema.omit({ condition: true }),
]);

export type TableAction = z.infer<typeof TableActionSchema>;
