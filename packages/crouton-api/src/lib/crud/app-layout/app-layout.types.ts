import { z } from 'zod';

// ─── Sidebar node types ───────────────────────────────────────────────────────

export const SidebarLeafSchema = z.object({
  kind: z.literal('item').default('item'),
  id: z.string(),
  label: z.string(),
  position: z.number().optional(),
});

export type SidebarLeaf = z.infer<typeof SidebarLeafSchema>;

export const SidebarGroupSchema = z.object({
  kind: z.literal('group').default('group'),
  id: z.string(),
  label: z.string(),
  position: z.number().optional(),
  children: z.array(SidebarLeafSchema).default([]),
});

export type SidebarGroup = z.infer<typeof SidebarGroupSchema>;

export const SidebarNodeSchema = z.discriminatedUnion('kind', [
  SidebarLeafSchema,
  SidebarGroupSchema,
]);

export type SidebarNode = z.infer<typeof SidebarNodeSchema>;
