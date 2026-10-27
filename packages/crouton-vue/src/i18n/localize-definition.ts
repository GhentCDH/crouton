import type { ResourceDefinition, ViewColumnConfig, ViewConfig } from '@ghentcdh/crouton-core';
import {
  actionKey,
  columnKey,
  resourceTitleKey,
} from '@ghentcdh/crouton-core';

import { useLanguage } from './useLanguage';

const idFromScope = (scope: string): string | undefined => {
  const match = /^#\/properties\/([^/]+)/.exec(scope);
  return match?.[1];
};

const translateUiElements = (
  elements: unknown[],
  t: (k: string, f?: string) => string,
  name: string,
): unknown[] =>
  elements.map((el) => {
    if (!el || typeof el !== 'object') return el;
    const element = el as Record<string, unknown>;
    const scope = element.scope as string | undefined;
    const id = scope ? idFromScope(scope) : undefined;
    const opts = element.options as Record<string, unknown> | undefined;
    const newEl =
      id && opts?.label
        ? {
            ...element,
            options: {
              ...opts,
              label: t(columnKey(name, id), opts.label as string),
            },
          }
        : element;
    const nested = (newEl as Record<string, unknown>).elements as unknown[] | undefined;
    if (Array.isArray(nested)) {
      return { ...(newEl as Record<string, unknown>), elements: translateUiElements(nested, t, name) };
    }
    return newEl;
  });

const translateJsonSchemaProps = (
  data: unknown,
  t: (k: string, f?: string) => string,
  name: string,
): unknown => {
  if (!data || typeof data !== 'object') return data;
  const d = data as Record<string, unknown>;
  if (!d.properties || typeof d.properties !== 'object') return data;
  const props = d.properties as Record<string, unknown>;
  const translated: Record<string, unknown> = {};
  for (const [col, prop] of Object.entries(props)) {
    if (prop && typeof prop === 'object') {
      const p = prop as Record<string, unknown>;
      translated[col] = p.title
        ? { ...p, title: t(columnKey(name, col), p.title as string) }
        : p;
    } else {
      translated[col] = prop;
    }
  }
  return { ...d, properties: translated };
};

const localizeSchema = (
  schema: ViewConfig | undefined,
  t: (k: string, f?: string) => string,
  name: string,
): ViewConfig | undefined => {
  if (!schema) return schema;
  const ui = schema.ui_schema as Record<string, unknown> | undefined;
  const elements = ui?.elements as unknown[] | undefined;
  const columns: ViewColumnConfig[] = schema.columns.map((col) => ({
    ...col,
    ...(col.label !== undefined && {
      label: t(col.labelKey ?? columnKey(name, col.id), col.label),
    }),
  }));
  return {
    ...schema,
    columns,
    ui_schema: elements
      ? { ...ui, elements: translateUiElements(elements, t, name) }
      : schema.ui_schema,
    json_schema: translateJsonSchemaProps(schema.json_schema, t, name) as Record<string, unknown>,
  };
};

/**
 * Apply client-side translations to a ResourceDefinition.
 * Reads the current bundle from useLanguage at call time — call again after a language change.
 */
export const localizeDefinition = (def: ResourceDefinition): ResourceDefinition => {
  const { translator } = useLanguage();
  const name = def.name;
  const t = translator;

  // Cast to unknown first then to the runtime shape — the schema API returns ViewConfig objects
  // but the TypeScript type only reflects the wire schema (data + ui, no columns/actions).
  const tableSchema = def.schemas.table as unknown as ViewConfig & Record<string, unknown>;
  const rowActions = Array.isArray(tableSchema['rowActions'])
    ? (tableSchema['rowActions'] as Array<Record<string, unknown>>).map((a) => ({
        ...a,
        label: t(actionKey(name, a['id'] as string), a['label'] as string),
      }))
    : tableSchema['rowActions'];
  const tableActions = Array.isArray(tableSchema['tableActions'])
    ? (tableSchema['tableActions'] as Array<Record<string, unknown>>).map((a) => ({
        ...a,
        ...(a['label'] ? { label: t(actionKey(name, a['id'] as string), a['label'] as string) } : {}),
      }))
    : tableSchema['tableActions'];

  const localizedTable = localizeSchema(tableSchema, t, name)!;

  return {
    ...def,
    title: t(resourceTitleKey(name), def.title),
    schemas: {
      ...def.schemas,
      table: {
        ...localizedTable,
        ...(rowActions !== undefined && { rowActions }),
        ...(tableActions !== undefined && { tableActions }),
      } as unknown as typeof def.schemas.table,
      form: localizeSchema(def.schemas.form as unknown as ViewConfig, t, name) as unknown as typeof def.schemas.form,
      view: localizeSchema(def.schemas.view as unknown as ViewConfig, t, name) as unknown as typeof def.schemas.view,
    },
  };
};
