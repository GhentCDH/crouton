import {
  type ZodObject,
  type ZodRawShape,
  type ZodType,
} from 'zod';

import { type SchemaInput, isZodSchema } from '@ghentcdh/crouton-core';

type ZodTypeInternal = ZodType & { _zod?: { def?: { type?: string; innerType?: ZodType; element?: ZodType } } };

const unwrap = (schema: ZodType): ZodType => {
  let s: ZodTypeInternal = schema;
  let t: string | undefined = s._zod?.def?.type;
  while (t === 'optional' || t === 'nullable' || t === 'default' || t === 'readonly') {
    s = (s._zod?.def?.innerType ?? s) as ZodTypeInternal;
    t = s._zod?.def?.type;
  }
  return s;
};

const typeOf = (schema: ZodType): string | undefined =>
  (schema as ZodTypeInternal)?._zod?.def?.type;

export const toSelectFields = (schema: SchemaInput): Record<string, any> => {
  if (!isZodSchema(schema)) {
    return Object.keys(schema.properties).reduce<Record<string, any>>(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {},
    );
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema.shape)) {
    const inner = unwrap(value as ZodType);
    const t = typeOf(inner);

    if (t === 'object') {
      result[key] = { select: toSelectFields(inner as ZodObject<ZodRawShape>) };
      continue;
    }

    if (t === 'array') {
      const element = unwrap((inner as ZodTypeInternal)._zod?.def?.element as ZodType);
      if (typeOf(element) === 'object') {
        result[key] = {
          select: toSelectFields(element as ZodObject<ZodRawShape>),
        };
        continue;
      }
    }

    result[key] = true;
  }
  return result;
};
