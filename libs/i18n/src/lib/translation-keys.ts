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

/**
 * Key segment for a layout title/label: lowercase, non letter/digit runs → `_`.
 * `"General info"` → `general_info`. Empty when the text has no letters or digits.
 */
export const layoutTitleSlug = (text: string): string =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');

/** Layout node title / label (group, collapse, tabs, …) in `layout.form` / `layout.view`. */
export const layoutTitleKey = (resource: string, text: string): string =>
  `resources.${resource}.layout.${layoutTitleSlug(text)}`;

export const enumKey = (enumName: string, value: string): string =>
  `enums.${enumName}.${value}`;

export const sidebarGroupKey = (group: string): string =>
  `sidebarGroups.${group}`;

export const validationKey = (code: string): string =>
  `validation.${code}`;
