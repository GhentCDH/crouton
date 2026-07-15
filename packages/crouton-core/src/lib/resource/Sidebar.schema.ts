import z from 'zod';

/**
 * Configuration for a single sidebar group, defined centrally in `crouton.json`.
 * Keyed by the group slug (e.g. `"metadata"`).
 */
export const SidebarGroupSchema = z.object({
  /** Human-readable heading shown in the sidebar. Defaults to a title-cased version of the slug. */
  label: z.string().optional(),
  /** Controls the order of this group among top-level sidebar items. */
  position: z.number().optional(),
});

export type SidebarGroupConfig = z.infer<typeof SidebarGroupSchema>;

export const SidebarSchema = z.object({
  hide: z.boolean().default(false), // default: false
  position: z.number().optional(), // default: sorted alphabetically after positioned entries
  label: z.string().optional(), // default: resource `title`

  /**
   * Slug of the group this resource belongs to.
   * Must match a key in `sidebarGroups` in `crouton.json`.
   * Resources with the same `group` are nested under a shared collapsible section.
   */
  group: z.string().optional(), // must match a key in `sidebarGroups` (crouton.json)
});

export type Sidebar = z.infer<typeof SidebarSchema>;
