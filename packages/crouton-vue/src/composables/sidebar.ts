import type { ShellMenu } from '@ghentcdh/crouton-ui-vue';

import { CROUTON_FORM } from '../router';

// ─── Node types (mirror the API payload shape) ────────────────────────────────

export type SidebarLeaf = {
  kind: 'item';
  /** Resource `name` — stable id for URLs and translation keys. */
  id: string;
  /** API mount point of the resource; differs from `id` when `route` ≠ `name`. */
  route?: string;
  label: string;
  position?: number;
};

export type SidebarGroup = {
  kind: 'group';
  id: string;
  label: string;
  position?: number;
  children: SidebarLeaf[];
};

export type SidebarNode = SidebarLeaf | SidebarGroup;

// ─── Type guards ──────────────────────────────────────────────────────────────

export const isSidebarGroup = (node: SidebarNode): node is SidebarGroup =>
  node.kind === 'group';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const firstLeafId = (nodes: SidebarNode[]): string | undefined => {
  const first = nodes[0];
  if (!first) return undefined;
  return isSidebarGroup(first) ? first.children[0]?.id : first.id;
};

/**
 * API route for a sidebar id (resource `name`). Falls back to the id itself
 * when it is not a sidebar leaf — callers may already pass a route.
 */
export const routeOfLeaf = (nodes: SidebarNode[], id: string): string => {
  for (const n of nodes) {
    const leaf = isSidebarGroup(n) ? n.children.find((c) => c.id === id) : n.id === id ? n : undefined;
    if (leaf) return leaf.route ?? id;
  }
  return id;
};

const leafToMenuItem = (leaf: SidebarLeaf) => ({
  name: 'admin',
  label: leaf.label,
  routerLink: CROUTON_FORM,
  params: { formId: leaf.id },
});

/**
 * Flatten SidebarNode[] into a ShellMenu.
 * Groups are inlined (children become top-level entries).
 * Kept for consumers that rely on ShellMenu; AdminView uses SidebarNode[] directly.
 */
export const menu = (nodes: SidebarNode[]): ShellMenu =>
  (nodes ?? []).flatMap((node) =>
    isSidebarGroup(node)
      ? node.children.map(leafToMenuItem)
      : [leafToMenuItem(node)],
  ) as ShellMenu;
