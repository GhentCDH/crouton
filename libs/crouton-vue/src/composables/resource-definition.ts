import { ref } from 'vue';
import { fromJSONSchema, z } from 'zod';

import type { ResourceDefinition, ResourceViewSchema } from '@ghentcdh/crouton-core';
import { ResourceDefinitionResponseZ } from '@ghentcdh/crouton-core';

import { useApi } from './useApi';
import { localizeDefinition } from '../i18n/localize-definition';

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
  // Reactive version — reading it in a computedAsync makes the async re-run on invalidateAll().
  readonly version = ref(0);

  async getById(formId: string): Promise<ResourceDefinition> {
    return this.getByUri(`${formId}/schemas`);
  }

  async getByUri(uri: string): Promise<ResourceDefinition> {
    // Read version so any computedAsync calling this re-runs after invalidateAll().
    void this.version.value;

    const cached = this.cache.get(uri);
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
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          this.cache.delete(uri);
          return null as unknown as ResourceDefinition;
        }
        throw err;
      });

    this.cache.set(uri, promise);
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
    this.version.value++;
  }
}
