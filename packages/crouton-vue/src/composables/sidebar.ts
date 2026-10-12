import { isSidebarGroup } from '@ghentcdh/crouton-frontend-core';
import type { SidebarLeaf, SidebarNode } from '@ghentcdh/crouton-frontend-core';
import type { ShellMenu } from '@ghentcdh/crouton-ui-vue';

import { CROUTON_FORM } from '../router';

export type {
  SidebarGroup,
  SidebarLeaf,
  SidebarNode,
} from '@ghentcdh/crouton-frontend-core';
export {
  firstLeafId,
  isSidebarGroup,
  isSidebarLeaf,
} from '@ghentcdh/crouton-frontend-core';

const leafToMenuItem = (leaf: SidebarLeaf) => ({
  name: 'admin',
  label: leaf.label,
  routerLink: CROUTON_FORM,
  params: { formId: leaf.id },
});

export const menu = (nodes: SidebarNode[]): ShellMenu =>
  (nodes ?? []).flatMap((node) =>
    isSidebarGroup(node)
      ? node.children.map(leafToMenuItem)
      : [leafToMenuItem(node)],
  ) as ShellMenu;
