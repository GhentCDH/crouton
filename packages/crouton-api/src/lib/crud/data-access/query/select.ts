import {
  type ZodObject,
  type ZodRawShape,
  type ZodType,
} from 'zod';

import { type SchemaInput, type ZodTypeInternal, isZodSchema, unwrap  } from '@ghentcdh/crouton-core';

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
