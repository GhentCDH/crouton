export type MenuAction = () => void | {
  routerLink: string;
  params?: Record<string, string>;
};

export type MenuWithItems = {
  label: string;
  items?: MenuWithItems[];
  action?: MenuAction;
  disabled?: boolean;
};

export type Breadcrumb = {
  label: string;
  routerLink?: string;
  params?: Record<string, string>;
};
