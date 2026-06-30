import type { ShellMenu } from '@ghentcdh/ui';

import { CROUTON_FORM } from '../router';

// ─── Node types (mirror the API payload shape) ────────────────────────────────

export type SidebarLeaf = {
  kind: 'item';
  id: string;
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

export const isSidebarLeaf = (node: SidebarNode): node is SidebarLeaf =>
  node.kind === 'item';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const firstLeafId = (nodes: SidebarNode[]): string | undefined => {
  const first = nodes[0];
  if (!first) return undefined;
  return isSidebarGroup(first) ? first.children[0]?.id : first.id;
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
