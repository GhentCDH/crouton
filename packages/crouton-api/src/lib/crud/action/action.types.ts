import { z } from 'zod';

import type { JsonActionCondition } from '@ghentcdh/crouton-core';

// ── Shared metadata ────────────────────────────────────────────────────────

export const ActionMetadataSchema = z.object({
  /** URL segment used in the endpoint. */
  id: z.string(),
  /** Human-readable label shown as a button. */
  label: z.string().optional(),
  /** MDI icon name, e.g. `"mdi:open-in-new"`. */
  icon: z.string().optional(),
  /** Tooltip text. Falls back to `label` when omitted. */
  tooltip: z.string().optional(),
  /** Per-row condition — button is hidden when false. */
  condition: z.custom<JsonActionCondition>().optional(),
});

// ── Link actions (same for row and table) ──────────────────────────────────

export const ResourceLinkActionSchema = ActionMetadataSchema.extend({
  type: z.literal('link'),
  /** URL to open. May contain `{id}` or `{env.VAR}` placeholders. */
  href: z.string(),
});

// ── Procedure actions — row-level ──────────────────────────────────────────

export const ResourceRowProcedureActionSchema = ActionMetadataSchema.extend({
  type: z.literal('procedure').optional(),
  /** HTTP method for the endpoint. Defaults to `"post"`. */
  method: z.string().optional(),
  /** Static data payload merged into the request body by the frontend. */
  data: z.record(z.string(), z.unknown()).optional(),
  /** Procedure called with `(prisma, recordId)`. */
  procedure: z.custom<(prisma: any, recordId: string | number) => Promise<any>>(
    (v) => typeof v === 'function',
  ),
});

// ── Procedure actions — table-level ────────────────────────────────────────

export const ResourceTableProcedureActionSchema = ActionMetadataSchema.extend({
  type: z.literal('procedure').optional(),
  /** HTTP method for the endpoint. Defaults to `"post"`. */
  method: z.string().optional(),
  /** Static data payload merged into the request body by the frontend. */
  data: z.record(z.string(), z.unknown()).optional(),
  /** Procedure called with `(prisma)` — no record id. */
  procedure: z.custom<(prisma: any) => Promise<any>>(
    (v) => typeof v === 'function',
  ),
});

// ── Union types ────────────────────────────────────────────────────────────

export type ResourceLinkAction = z.infer<typeof ResourceLinkActionSchema>;
export type ResourceRowProcedureAction = z.infer<
  typeof ResourceRowProcedureActionSchema
>;
export type ResourceTableProcedureAction = z.infer<
  typeof ResourceTableProcedureActionSchema
>;

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
// ── Type guards ────────────────────────────────────────────────────────────

export const isRowProcedureAction = (
  action: ResourceRowAction,
): action is ResourceRowProcedureAction => action.type !== 'link';

export const isTableProcedureAction = (
  action: ResourceTableAction,
): action is ResourceTableProcedureAction => action.type !== 'link';
