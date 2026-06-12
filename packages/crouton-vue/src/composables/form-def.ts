import { fromJSONSchema, z } from 'zod';

import { useApi } from './useApi';
import { FormDefResponseZ } from './form-def.schema';
import type { FormDef, FormSchema } from './form-def.types';

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

const safeFromJSONSchema = (data: Record<string, unknown>) => {
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
      const parsed =
        zodSchema.partial?.().safeParse(value) ?? zodSchema.safeParse(value);
      return parsed.data ?? value;
    } catch {
      return value;
    }
  };
  return { ...formSchema, zodSchema, parseValue };
};

export class FormDefCache {
  private cache = new Map<string, Promise<FormDef>>();

  async getFormDef(formId: string): Promise<FormDef> {
    return this.getFormDefByUri(`${formId}/schemas`);
  }

  async getFormDefByUri(uri: string): Promise<FormDef> {
    const cached = this.cache.get(uri);
    if (cached) return cached;

    const promise = useApi()
      .get(uri)
      .then((res) => {
        const result = FormDefResponseZ.parse(res.data);
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

    this.cache.set(uri, promise);
    return promise;
  }
}
