import { actionKey, columnKey, resourceTitleKey } from '@crouton/i18n';

import type { ResourceDefinition, ViewColumnConfig, ViewConfig } from '@ghentcdh/crouton-core';

import { useLanguage } from './useLanguage';

const idFromScope = (scope: string): string | undefined => {
  const match = /^#\/properties\/([^/]+)/.exec(scope);
  return match?.[1];
};

type Translator = (k: string, f?: string) => string;

/**
 * Key candidates for a definition. Sub-resources (id `parent/child`) live
 * under `resources.<parent>.subResources.<child>` in the translation bundle;
 * top-level resources under `resources.<name>`. Candidates are tried in
 * order until one resolves.
 */
const keyCandidates = (def: ResourceDefinition) => {
  const [parentRoute, childRoute] = def.id.includes('/') ? def.id.split('/') : [];
  if (parentRoute && childRoute) {
    const subPrefix = (parent: string, child: string): string =>
      `resources.${parent}.subResources.${child}`;
    const subKeys = (leaf: string): string[] => {
      // Primary: bundle keys the sub-resource by its route.
      const keys = [`${subPrefix(parentRoute, childRoute)}${leaf}`];
      // The bundle may key the sub-resource by its configured name instead.
      if (def.name && def.name !== childRoute) {
        keys.push(`${subPrefix(parentRoute, def.name)}${leaf}`);
      }
      // Tolerate bundles that store sub-resources flat under their own name.
      keys.push(`resources.${childRoute}${leaf}`);
      return keys;
    };
    return {
      title: (): string[] => subKeys('.title'),
      column: (col: string): string[] => subKeys(`.columns.${col}`),
      action: (id: string): string[] => subKeys(`.actions.${id}`),
    };
  }
  return {
    title: (): string[] => [resourceTitleKey(def.name)],
    column: (col: string): string[] => [columnKey(def.name, col)],
    action: (id: string): string[] => [actionKey(def.name, id)],
  };
};

/** Try each candidate key in order; the last fallback wins if none resolve. */
const tFirst = (t: Translator, keys: string[], fallback: string): string =>
  keys.reduceRight((acc, key) => t(key, acc), fallback);

const translateUiElements = (
  elements: unknown[],
  t: Translator,
  keys: ReturnType<typeof keyCandidates>,
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
              label: tFirst(t, keys.column(id), opts.label as string),
            },
          }
        : element;
    const nested = (newEl as Record<string, unknown>).elements as unknown[] | undefined;
    if (Array.isArray(nested)) {
      return { ...(newEl as Record<string, unknown>), elements: translateUiElements(nested, t, keys) };
    }
    return newEl;
  });

const translateJsonSchemaProps = (
  data: unknown,
  t: Translator,
  keys: ReturnType<typeof keyCandidates>,
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
        ? { ...p, title: tFirst(t, keys.column(col), p.title as string) }
        : p;
    } else {
      translated[col] = prop;
    }
  }
  return { ...d, properties: translated };
};

const localizeSchema = (
  schema: ViewConfig | undefined,
  t: Translator,
  keys: ReturnType<typeof keyCandidates>,
): ViewConfig | undefined => {
  if (!schema) return schema;
  const ui = schema.ui as Record<string, unknown> | undefined;
  const rawData = schema.data;
  const elements = ui?.elements as unknown[] | undefined;
  const columns: ViewColumnConfig[] = (schema.columns ?? []).map((col) => ({
    ...col,
    ...(col.label !== undefined && {
      label: col.labelKey
        ? t(col.labelKey, col.label)
        : tFirst(t, keys.column(col.id), col.label),
    }),
  }));
  const translatedUi = elements ? { ...ui, elements: translateUiElements(elements, t, keys) } : ui;
  const translatedData = translateJsonSchemaProps(rawData, t, keys) as Record<string, unknown>;
  return {
    ...schema,
    columns,
    ui: translatedUi,
    data: translatedData,
  };
};

/**
 * Apply client-side translations to a ResourceDefinition.
 * Reads the current bundle from useLanguage at call time — call again after a language change.
 */
export const localizeDefinition = (def: ResourceDefinition): ResourceDefinition => {
  const { translator } = useLanguage();
  const keys = keyCandidates(def);
  const t = translator;

  // Cast to unknown first then to the runtime shape — the schema API returns ViewConfig objects
  // but the TypeScript type only reflects the wire schema (data + ui, no columns/actions).
  const tableSchema = def.schemas.table as unknown as ViewConfig & Record<string, unknown>;
  const rowActions = Array.isArray(tableSchema['rowActions'])
    ? (tableSchema['rowActions'] as Array<Record<string, unknown>>).map((a) => ({
        ...a,
        label: tFirst(t, keys.action(a['id'] as string), a['label'] as string),
      }))
    : tableSchema['rowActions'];
  const tableActions = Array.isArray(tableSchema['tableActions'])
    ? (tableSchema['tableActions'] as Array<Record<string, unknown>>).map((a) => ({
        ...a,
        ...(a['label'] ? { label: tFirst(t, keys.action(a['id'] as string), a['label'] as string) } : {}),
      }))
    : tableSchema['tableActions'];

  const localizedTable = localizeSchema(tableSchema, t, keys) ?? tableSchema;

  return {
    ...def,
    title: tFirst(t, keys.title(), def.title),
    schemas: {
      ...def.schemas,
      table: {
        ...localizedTable,
        ...(rowActions !== undefined && { rowActions }),
        ...(tableActions !== undefined && { tableActions }),
      } as unknown as typeof def.schemas.table,
      form: localizeSchema(def.schemas.form as unknown as ViewConfig, t, keys) as unknown as typeof def.schemas.form,
      view: localizeSchema(def.schemas.view as unknown as ViewConfig, t, keys) as unknown as typeof def.schemas.view,
    },
  };
};
