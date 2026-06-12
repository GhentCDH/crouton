import type { ShellMenu } from '@ghentcdh/ui';

import { CROUTON_FORM } from '../router';

export type SideBarItem = {
  id: string;
  route: string;
  title: string;
};

export const menu = (sideBar: SideBarItem[]): ShellMenu =>
  (sideBar ?? []).map((s) => ({
    name: 'admin',
    label: s.title,
    routerLink: CROUTON_FORM,
    params: { formId: s.id },
  })) as ShellMenu;
