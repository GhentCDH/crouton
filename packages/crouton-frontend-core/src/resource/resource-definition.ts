import { fromJSONSchema, z } from 'zod';

import type { ResourceDefinition, ResourceViewSchema } from '@ghentcdh/crouton-core';
import { ResourceDefinitionResponseZ } from '@ghentcdh/crouton-core';

import type { HttpClient } from '../api/ports';

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

const cacheKey = (uri: string, language: string): string =>
  language ? `${language}:${uri}` : uri;

export class ResourceDefinitionCache {
  private cache = new Map<string, Promise<ResourceDefinition>>();

  constructor(
    private http: HttpClient,
    private getLanguage: () => string = () => '',
  ) {}


  async getById(formId: string): Promise<ResourceDefinition> {
    return this.getByUri(`${formId}/schemas`);
  }

  async getByUri(uri: string): Promise<ResourceDefinition> {
    const key = cacheKey(uri, this.getLanguage());
    const cached = this.cache.get(key);
    if (cached) return cached;

    const promise = this.http.get(uri).then((res) => {
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
          filter: createViewSchema(result.schemas.filter),
        },
      };
      return resourceDefinition;
    });

    this.cache.set(key, promise);
    return promise;
  }

  /**
   * Drops cached entries for `formId` across all languages so the
   * next call refetches from the backend.
   */
  invalidate(formId: string): void {
    const suffix = `${formId}/schemas`;
    for (const key of this.cache.keys()) {
      if (key === suffix || key.endsWith(`:${suffix}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Drops every cached ResourceDefinition. Used after a multi-resource database sync
   * or a language change where all cached entries must be refreshed.
   */
  invalidateAll(): void {
    this.cache.clear();
  }
}
