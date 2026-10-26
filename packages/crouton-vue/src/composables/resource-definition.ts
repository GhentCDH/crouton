import { fromJSONSchema, z } from 'zod';

import type { ResourceDefinition, ResourceViewSchema } from '@ghentcdh/crouton-core';
import {
  ResourceDefinitionResponseZ,
  actionKey,
  columnKey,
  resourceTitleKey,
} from '@ghentcdh/crouton-core';

import { useApi } from './useApi';
import { useLanguage } from './useLanguage';

// ─── Client-side translation helpers ─────────────────────────────────────────

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
  schema: ResourceViewSchema | undefined,
  t: (k: string, f?: string) => string,
  name: string,
): ResourceViewSchema | undefined => {
  if (!schema) return schema;
  const ui = schema.ui as Record<string, unknown> | undefined;
  const elements = ui?.elements as unknown[] | undefined;
  const columns = Array.isArray(schema.columns)
    ? schema.columns.map((col) => ({
        ...col,
        ...(col.label !== undefined && {
          label: t(columnKey(name, col.id), col.label),
        }),
      }))
    : schema.columns;
  return {
    ...schema,
    columns,
    ui: elements
      ? { ...ui, elements: translateUiElements(elements, t, name) }
      : schema.ui,
    data: translateJsonSchemaProps(schema.data, t, name),
  };
};

/**
 * Apply client-side translations to a ResourceDefinition.
 * Called after fetching from the backend (which no longer localizes schemas).
 */
const localizeDefinition = (def: ResourceDefinition): ResourceDefinition => {
  const { translator } = useLanguage();
  const name = def.name;
  const t = translator;

  const tableSchema = def.schemas.table as ResourceViewSchema & Record<string, unknown>;
  const rowActions = Array.isArray(tableSchema.rowActions)
    ? (tableSchema.rowActions as Array<Record<string, unknown>>).map((a) => ({
        ...a,
        label: t(actionKey(name, a.id as string), a.label as string),
      }))
    : tableSchema.rowActions;
  const tableActions = Array.isArray(tableSchema.tableActions)
    ? (tableSchema.tableActions as Array<Record<string, unknown>>).map((a) => ({
        ...a,
        ...(a.label && { label: t(actionKey(name, a.id as string), a.label as string) }),
      }))
    : tableSchema.tableActions;

  return {
    ...def,
    title: t(resourceTitleKey(name), def.title),
    schemas: {
      ...def.schemas,
      table: {
        ...localizeSchema(def.schemas.table, t, name)!,
        ...(rowActions !== undefined && { rowActions }),
        ...(tableActions !== undefined && { tableActions }),
      },
      form: localizeSchema(def.schemas.form, t, name)!,
      view: localizeSchema(def.schemas.view, t, name),
    },
  };
};

const stripAdditionalProperties = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripAdditionalProperties);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== 'additionalProperties')
        .map(([k, v]) => [k, stripAdditionalProperties(v)]),
    );
  }
  return value;
};

const safeFromJSONSchema = (data: unknown) => {
  try {
    return fromJSONSchema(
      stripAdditionalProperties(data) as Record<string, unknown>,
    );
  } catch (e) {
    console.warn('[crouton] fromJSONSchema failed, falling back to z.any()', e);
    return z.any();
  }
};

const createViewSchema = (
  formSchema?: Omit<ResourceViewSchema, 'zodSchema' | 'parseValue'>,
): ResourceViewSchema | undefined => {
  if (!formSchema) return undefined;
  const zodSchema = safeFromJSONSchema(formSchema.data);
  const parseValue = (value: any) => {
    try {
      const schema =
        zodSchema instanceof z.ZodObject ? zodSchema.partial() : zodSchema;
      const parsed = schema.safeParse(value);
      return parsed.data ?? value;
    } catch {
      return value;
    }
  };
  return { ...formSchema, zodSchema, parseValue };
};

export class ResourceDefinitionCache {
  private cache = new Map<string, Promise<ResourceDefinition>>();

  async getById(formId: string): Promise<ResourceDefinition> {
    return this.getByUri(`${formId}/schemas`);
  }

  async getByUri(uri: string): Promise<ResourceDefinition> {
    const key = uri;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const promise = useApi()
      .get(uri)
      .then((res) => {
        const safe = ResourceDefinitionResponseZ.safeParse(res.data);
        if (!safe.success) {
          console.error('Parse failed for ', uri);
          console.error(safe.error);
          throw new Error(safe.error as unknown as string);
        }

        const result = safe.data ?? res.data;

        const resourceDefinition: ResourceDefinition = {
          ...result,
          schemas: {
            table: createViewSchema(result.schemas.table)!,
            form: createViewSchema(result.schemas.form)!,
            view: createViewSchema(result.schemas.view),
          },
        };
        return localizeDefinition(resourceDefinition);
      });

    this.cache.set(key, promise);
    return promise;
  }

  /**
   * Drops the cached entry for `formId` so the next call refetches from the backend.
   */
  invalidate(formId: string): void {
    this.cache.delete(`${formId}/schemas`);
  }

  /**
   * Drops every cached ResourceDefinition. Used after a multi-resource database sync
   * or a language change where all cached entries must be refreshed.
   */
  invalidateAll(): void {
    this.cache.clear();
  }
}
