export const resourceTitleKey = (resource: string): string =>
  `resources.${resource}.title`;

export const resourceSidebarKey = (resource: string): string =>
  `resources.${resource}.sidebar`;

export const columnKey = (resource: string, column: string): string =>
  `resources.${resource}.columns.${column}`;

export const actionKey = (resource: string, action: string): string =>
  `resources.${resource}.actions.${action}`;

export const subResourceTitleKey = (parent: string, child: string): string =>
  `resources.${parent}.subResources.${child}.title`;

export const subResourceColumnKey = (
  parent: string,
  child: string,
  column: string,
): string => `resources.${parent}.subResources.${child}.columns.${column}`;

export const subResourceActionKey = (
  parent: string,
  child: string,
  action: string,
): string => `resources.${parent}.subResources.${child}.actions.${action}`;

export const enumKey = (enumName: string, value: string): string =>
  `enums.${enumName}.${value}`;

export const sidebarGroupKey = (group: string): string =>
  `sidebarGroups.${group}`;

export const validationKey = (code: string): string =>
  `validation.${code}`;
