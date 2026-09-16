import type { ZodType } from 'zod';
import { z } from 'zod';

type ToJSONSchemaParams = NonNullable<
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  Parameters<typeof import('zod').toJSONSchema>[1]
>;
type OverrideContext = Parameters<
  NonNullable<ToJSONSchemaParams['override']>
>[0];

/**
 * Detect if a ZodCustom schema wraps a `z.instanceof(Cls)` where `Cls.name`
 * matches the given name. Uses a single `safeParse(null)` to extract the
 * `expected` field from the validation error — lightweight and works even
 * when the class reference is unreachable (closure-captured as `cls`).
 */
const isInstanceOf = (zodSchema: unknown, className: string): boolean => {
  if (!(zodSchema instanceof z.ZodCustom)) return false;
  const result = (zodSchema as z.ZodCustom<unknown>).safeParse(null);
  if (result.success) return false;
  const issue = result.error.issues[0] as { expected?: string; message?: string };
  // When z.instanceof(Cls) has no custom message, Zod emits { expected: 'Cls.name' }.
  // When a custom message is provided (e.g. zod-prisma-types does this), Zod emits
  // { code: 'custom', message: '...' } with no `expected` — so also check the message.
  return issue?.expected === className || (issue?.message?.includes(className) ?? false);
};

const jsonSchemaOverride = ({ zodSchema, jsonSchema }: OverrideContext) => {
  if (zodSchema instanceof z.ZodDate) {
    jsonSchema.type = 'string';
    jsonSchema.format = 'date-time';
  }
  // Prisma BigInt fields use z.bigint() which has no JSON schema equivalent.
  // Patch to { type: "integer" } so the frontend treats them as whole numbers.
  if (zodSchema instanceof z.ZodBigInt) {
    jsonSchema.type = 'integer';
  }
  // Prisma Decimal fields use z.instanceof(Prisma.Decimal) which produces
  // an empty JSON schema ({}). Patch to { type: "number" } so the frontend
  // renders a number input with proper validation.
  // Prisma 7+ bundles the class as 'Decimal2'; check both names.
  if (isInstanceOf(zodSchema, 'Decimal') || isInstanceOf(zodSchema, 'Decimal2')) {
    jsonSchema.type = 'number';
  }
  // Prisma Bytes fields use z.instanceof(Buffer) which produces an empty
  // JSON schema. Patch to { type: "string" } since binary data is typically
  // base64-encoded when serialized to JSON.
  if (isInstanceOf(zodSchema, 'Buffer')) {
    jsonSchema.type = 'string';
  }
};

type ZodTypeInternal = ZodType & { _zod?: { def?: { type?: string; innerType?: ZodType } } };

/** Strip optional/nullable/default/readonly wrappers to reach the core type. */
const unwrap = (schema: ZodType): ZodType => {
  let s: ZodTypeInternal = schema;
  let t: string | undefined = s._zod?.def?.type;
  while (t === 'optional' || t === 'nullable' || t === 'default' || t === 'readonly') {
    s = (s._zod?.def?.innerType ?? s) as ZodTypeInternal;
    t = s._zod?.def?.type;
  }
  return s;
};

/**
 * Returns true when `zodType` (after unwrapping) is a `z.instanceof(Prisma.Decimal)`.
 * Checks both 'Decimal' (Prisma ≤6) and 'Decimal2' (Prisma 7+ runtime bundle).
 */
export const isDecimalField = (zodType: ZodType): boolean => {
  const inner = unwrap(zodType);
  return isInstanceOf(inner, 'Decimal') || isInstanceOf(inner, 'Decimal2');
};

export const jsonSchemaOpts = {
  unrepresentable: 'any' as const,
  override: jsonSchemaOverride,
};
