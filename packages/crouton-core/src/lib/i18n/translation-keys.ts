export const resourceTitleKey = (resource: string): string =>
  `resources.${resource}.title`;

export const resourceSidebarKey = (resource: string): string =>
  `resources.${resource}.sidebar`;

export const columnKey = (resource: string, column: string): string =>
  `resources.${resource}.columns.${column}`;

export const actionKey = (resource: string, action: string): string =>
  `resources.${resource}.actions.${action}`;

export const subResourceTitleKey = (
  resource: string,
  sub: string,
): string => `resources.${resource}.subResources.${sub}.title`;

export const subResourceColumnKey = (
  resource: string,
  sub: string,
  column: string,
): string => `resources.${resource}.subResources.${sub}.columns.${column}`;

export const enumKey = (enumName: string, value: string): string =>
  `enums.${enumName}.${value}`;

export const sidebarGroupKey = (group: string): string =>
  `sidebarGroups.${group}`;

export const uiKey = (path: string): string => `ui.${path}`;

export const validationKey = (code: string): string =>
  `validation.${code}`;
