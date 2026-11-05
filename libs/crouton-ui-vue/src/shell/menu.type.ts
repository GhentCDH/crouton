export type MenuItem = {
  label: string;
  routerLink: string;
  params?: Record<string, string>;
};

export type ShellMenu = MenuItem[];

export type User = {
  name: string;
  email: string;
  avatar: string;
};
