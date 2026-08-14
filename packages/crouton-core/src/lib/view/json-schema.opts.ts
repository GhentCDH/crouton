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
  return (
    !result.success &&
    (result.error.issues[0] as { expected?: string })?.expected === className
  );
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
  if (isInstanceOf(zodSchema, 'Decimal')) {
    jsonSchema.type = 'number';
  }
  // Prisma Bytes fields use z.instanceof(Buffer) which produces an empty
  // JSON schema. Patch to { type: "string" } since binary data is typically
  // base64-encoded when serialized to JSON.
  if (isInstanceOf(zodSchema, 'Buffer')) {
    jsonSchema.type = 'string';
  }
};

export const jsonSchemaOpts = {
  unrepresentable: 'any' as const,
  override: jsonSchemaOverride,
};
