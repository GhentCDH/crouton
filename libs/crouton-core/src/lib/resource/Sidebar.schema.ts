import z from 'zod';

/**
 * Configuration for a single sidebar group, defined centrally in `crouton.json`.
 * Keyed by the group slug (e.g. `"metadata"`).
 */
export const SidebarGroupSchema = z.object({
  label: z.string().optional().describe('Human-readable heading shown in the sidebar. Defaults to a title-cased version of the slug.'),
  position: z.number().optional().describe('Controls the order of this group among top-level sidebar items.'),
});

export type SidebarGroupConfig = z.infer<typeof SidebarGroupSchema>;

export const SidebarSchema = z.object({
  hide: z.boolean().default(false).describe('When true, this resource is not shown in the sidebar navigation.'),
  position: z.number().optional().describe('Explicit position number. Lower values appear higher. Resources without a position are sorted alphabetically after positioned entries.'),
  label: z.string().optional().describe('Override label in the sidebar. Defaults to the resource title.'),
  group: z.string().optional().describe('Slug of the sidebar group this resource belongs to. Must match a key in sidebarGroups in crouton.json. Resources in the same group are nested under a shared collapsible section.'),
});

export type Sidebar = z.infer<typeof SidebarSchema>;
