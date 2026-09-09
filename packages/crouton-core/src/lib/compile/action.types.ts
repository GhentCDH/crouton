import { z } from 'zod';

import type { JsonActionCondition } from '../resource/TableAction.schema';

const ActionMetadataSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  icon: z.string().optional(),
  tooltip: z.string().optional(),
  condition: z.custom<JsonActionCondition>().optional(),
});

const ResourceLinkActionSchema = ActionMetadataSchema.extend({
  type: z.literal('link'),
  href: z.string(),
});

const ResourceRowProcedureActionSchema = ActionMetadataSchema.extend({
  type: z.literal('procedure').optional(),
  method: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  procedure: z.custom<(prisma: any, recordId: string | number) => Promise<any>>(
    (v) => typeof v === 'function',
  ),
});

const ResourceTableProcedureActionSchema = ActionMetadataSchema.extend({
  type: z.literal('procedure').optional(),
  method: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  procedure: z.custom<(prisma: any) => Promise<any>>(
    (v) => typeof v === 'function',
  ),
});

export type ResourceLinkAction = z.infer<typeof ResourceLinkActionSchema>;
export type ResourceRowProcedureAction = z.infer<typeof ResourceRowProcedureActionSchema>;
export type ResourceTableProcedureAction = z.infer<typeof ResourceTableProcedureActionSchema>;

export const ResourceRowActionSchema = z.union([
  ResourceRowProcedureActionSchema,
  ResourceLinkActionSchema,
]);
export type ResourceRowAction = z.infer<typeof ResourceRowActionSchema>;

export const ResourceTableActionSchema = z.union([
  ResourceTableProcedureActionSchema,
  ResourceLinkActionSchema,
]);
export type ResourceTableAction = z.infer<typeof ResourceTableActionSchema>;

export const isRowProcedureAction = (
  action: ResourceRowAction,
): action is ResourceRowProcedureAction => action.type !== 'link';

export const isTableProcedureAction = (
  action: ResourceTableAction,
): action is ResourceTableProcedureAction => action.type !== 'link';
