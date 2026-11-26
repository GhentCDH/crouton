import { ref } from 'vue';
import { fromJSONSchema, z } from 'zod';

import  { type ResourceDefinition, type ResourceJson, ResourceJsonSchema, type ResourceViewSchema } from '@ghentcdh/crouton-core';
import { ResourceDefinitionResponseZ, parseSchema } from '@ghentcdh/crouton-core';

import { localizeDefinition } from '../i18n/localize-definition';
import { useApi } from './useApi';

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
  const parseValue = (value: unknown): unknown => {
    try {
      const schema =
        zodSchema instanceof z.ZodObject ? zodSchema.partial() : zodSchema;
      const parsed = schema.safeParse(value);
      return (parsed.data as unknown) ?? value;
    } catch {
      return value;
    }
  };
  return { ...formSchema, zodSchema, parseValue };
};

export class ResourceDefinitionCache {
  private cache = new Map<string, Promise<ResourceDefinition>>();
  /**
   * Resources defined in code via `registerJsonResource`, keyed by resource
   * `name`. Kept separate from `cache` so `invalidateAll()` (which only drops
   * backend-fetched definitions) does not remove them.
   */
  private local = new Map<string, ResourceDefinition>();
  // Reactive version — reading it in a computedAsync makes the async re-run on invalidateAll().
  readonly version = ref(0);

  async getById(formId: string): Promise<ResourceDefinition> {
    const local = this.getRegistered(formId);
    if (local) return local;
    return this.getByUri(`${formId}/schemas`);
  }

  /** Synchronous lookup for a definition registered via `registerJsonResource`. */
  getRegistered(formId: string): ResourceDefinition | undefined {
    return this.local.get(formId);
  }

  async getByUri(uri: string): Promise<ResourceDefinition> {
    // Read version so any computedAsync calling this re-runs after invalidateAll().
    void this.version.value;

    const cached = this.cache.get(uri);
    if (cached) return cached;

    const promise = useApi()
      .get(uri)
      .then((res) => {
        return this.registerFormDefById(uri, res.data as ResourceDefinition);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          this.cache.delete(uri);
          return null as unknown as ResourceDefinition;
        }
        throw err;
      });

    this.cache.set(uri, promise);
    return promise;
  }

  registerJsonResource(resource: ResourceJson) {
    const parsed = this.parseResourceJson(resource);
    if (!parsed) {
      throw new Error(`Resource "${resource.name}" cannot be parsed`);
    }

    const definition = this.registerFormDefById(resource.name, parsed);
    // Remember it so `getFormDefById(name)` resolves without hitting the API,
    // which has no `/<name>/schemas` endpoint for code-defined resources.
    this.local.set(resource.name, definition);
    return definition;
  }

  private parseResourceJson(
    resource: ResourceJson,
  ): ResourceDefinition | null {
    try {
      const parsed = ResourceJsonSchema.safeParse(resource);
      if (!parsed.success) {
        console.error('Resource cannot be parsed:', parsed.error.message);
        return null;
      }

      // Compile columns → table/form/view schemas via crouton.
      // Returns undefined when resource has no columns/views.
      const compiled = parseSchema(resource, {
        baseUrl: '',
      });

      return {
        ...parsed.data,
        ...(compiled ?? {}),
      } as unknown as ResourceDefinition;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  registerFormDefById = (uri: string, formDef: ResourceDefinition) => {
    const safe = ResourceDefinitionResponseZ.safeParse(formDef);
    if (!safe.success) {
      console.error('Parse failed for ', uri);
      console.error(safe.error);
      throw new Error(safe.error as unknown as string);
    }

    const result = safe.data ?? formDef;

    const resourceDefinition: ResourceDefinition = {
      ...result,
      schemas: {
        table: createViewSchema(result.schemas.table) as ResourceViewSchema,
        form: createViewSchema(result.schemas.form) as ResourceViewSchema,
        view: createViewSchema(result.schemas.view),
      },
    };
    return localizeDefinition(resourceDefinition);
  };

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
