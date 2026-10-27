import type { ZodType } from 'zod';

/** Internal Zod v4 shape — not part of the public API. */
export type ZodTypeInternal = ZodType & {
  _zod?: { def?: { type?: string; innerType?: ZodType; element?: ZodType } };
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
