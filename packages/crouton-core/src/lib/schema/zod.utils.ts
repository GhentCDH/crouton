import type { ZodType } from 'zod';

/** Internal Zod v4 shape — not part of the public API. */
export type ZodTypeInternal = ZodType & {
  _zod?: {
    def?: {
      type?: string;
      innerType?: ZodType;
      element?: ZodType;
      getter?: () => ZodType;
    };
  };
};

/** Strip optional / nullable / default / readonly wrappers. */
export const unwrap = (schema: ZodType): ZodType => {
  let s: ZodTypeInternal = schema;
  let t: string | undefined = s._zod?.def?.type;
  while (t === 'optional' || t === 'nullable' || t === 'default' || t === 'readonly') {
    s = (s._zod?.def?.innerType ?? s) as ZodTypeInternal;
    t = s._zod?.def?.type;
  }
  return s;
};

/**
 * `true` when the field is a Prisma relation as emitted by zod-prisma-types in a
 * `*WithRelationsSchema`: `z.lazy(() => XSchema)`, optionally `.array()` /
 * `.nullable()`, resolving to an object. A Json field is lazy too but resolves
 * to a union, so it is not matched.
 */
export const isLazyRelationField = (schema: ZodType): boolean => {
  let s = unwrap(schema) as ZodTypeInternal;
  if (s._zod?.def?.type === 'array' && s._zod.def.element) {
    s = unwrap(s._zod.def.element) as ZodTypeInternal;
  }
  const getter = s._zod?.def?.type === 'lazy' ? s._zod.def.getter : undefined;
  return !!getter && (unwrap(getter()) as ZodTypeInternal)._zod?.def?.type === 'object';
};
