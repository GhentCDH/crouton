import { fromJSONSchema, z } from 'zod';

import { FormDefResponseZ } from './form-def.schema';
import type { FormDef, FormSchema } from './form-def.types';
import { useApi } from './useApi';
import { useLanguage } from './useLanguage';

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

const createFormSchema = (
  formSchema?: Omit<FormSchema, 'zodSchema' | 'parseValue'>,
): FormSchema | undefined => {
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

export class FormDefCache {
  private cache = new Map<string, Promise<FormDef>>();

  async getFormDefById(formId: string): Promise<FormDef> {
    return this.getFormDefByUri(`${formId}/schemas`);
  }

  async getFormDefByUri(uri: string): Promise<FormDef> {
    const { language } = useLanguage();
    const key = cacheKey(uri, language.value);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const promise = useApi()
      .get(uri)
      .then((res) => {
        const safe = FormDefResponseZ.safeParse(res.data);
        if (!safe.success) {
          console.error('Parse failed for ', uri);
          console.error(safe.error);
          throw new Error(safe.error as string);
        }

        const result = safe.data ?? res.data;

        const formDef: FormDef = {
          ...result,
          schemas: {
            table: createFormSchema(result.schemas.table)!,
            form: createFormSchema(result.schemas.form)!,
            view: createFormSchema(result.schemas.view),
            filter: createFormSchema(result.schemas.filter),
          },
        };
        return formDef;
      });

    this.cache.set(key, promise);
    return promise;
  }

  /**
   * Drops cached `FormDef` entries for `formId` across all languages so the
   * next `getFormDef` call refetches from the backend.
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
   * Drops every cached `FormDef`. Used after a multi-resource database sync
   * or a language change where all cached entries must be refreshed.
   */
  invalidateAll(): void {
    this.cache.clear();
  }
}
