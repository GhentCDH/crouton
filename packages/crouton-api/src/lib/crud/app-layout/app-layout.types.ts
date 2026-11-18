import { z } from 'zod';

// ─── Sidebar node types ───────────────────────────────────────────────────────

export const SidebarLeafSchema = z.object({
  kind: z.literal('item').default('item'),
  /** Stable id (resource `name`) — used for translation keys and app URLs. */
  id: z.string(),
  /** API mount point. Differs from `id` when `route` ≠ `name`. */
  route: z.string().optional(),
  label: z.string(),
  position: z.number().optional(),
});

export type SidebarLeaf = z.infer<typeof SidebarLeafSchema>;

export type SidebarGroup = {
  kind: 'group';
  id: string;
  label: string;
  position?: number;
  children: SidebarLeaf[];
};

export type SidebarNode = SidebarLeaf | SidebarGroup;
