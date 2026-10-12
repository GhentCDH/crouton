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
