import { labelFromId, type SidebarGroupConfig } from '@ghentcdh/crouton-core';
import { type SidebarGroup, type SidebarLeaf, SidebarLeafSchema, type SidebarNode } from './app-layout.types';
import { Resource } from '../resource/ResourceConfig.schema';

// ─── Sort helper ─────────────────────────────────────────────────────────────

const byPosition = (
  a: { position?: number; label: string },
  b: { position?: number; label: string },
) => {
  if (a.position != null && b.position != null) return a.position - b.position;
  if (a.position != null) return -1;
  if (b.position != null) return 1;
  return a.label.localeCompare(b.label);
};

// ─── Builder ──────────────────────────────────────────────────────────────────

export const buildLayoutPayload = (
  configs: Resource[],
  sidebarGroups: Record<string, SidebarGroupConfig> = {},
  title?: string,
  autoSave = true,
) => {
  const visible = configs.filter(
    (c) => c.sidebar?.hide !== true && c.views?.['table'],
  );

  const topLevel: SidebarLeaf[] = [];
  // Pre-seed group map from the central config so label/position are authoritative.
  const groupMap = new Map<
    string,
    { label: string; position?: number; children: SidebarLeaf[] }
  >(
    Object.entries(sidebarGroups).map(([slug, cfg]) => [
      slug,
      {
        label: cfg.label ?? labelFromId(slug),
        position: cfg.position,
        children: [],
      },
    ]),
  );

  for (const c of visible) {
    const leaf = SidebarLeafSchema.parse({
      id: c.name,
      label: c.sidebar?.label ?? c.title ?? c.tag,
      position: c.sidebar?.position,
    });

    const groupSlug = c.sidebar?.group;
    if (groupSlug) {
      // Group must exist in the central config; fall back gracefully if not.
      if (!groupMap.has(groupSlug)) {
        groupMap.set(groupSlug, {
          label: labelFromId(groupSlug),
          children: [],
        });
      }
      groupMap.get(groupSlug)!.children.push(leaf);
    } else {
      topLevel.push(leaf);
    }
  }

  // Sort children within each group, then build group nodes.
  const groups: SidebarGroup[] = [...groupMap.entries()]
    // Only include groups that have at least one visible resource.
    .filter(([, g]) => g.children.length > 0)
    .map(([id, g]) => ({
      kind: 'group',
      id,
      label: g.label,
      position: g.position,
      children: g.children.sort(byPosition),
    }));

  // Merge top-level items and groups, sort together.
  const sidebar: SidebarNode[] = [...topLevel, ...groups].sort(byPosition);

  return { sidebar, title, autoSave };
};
