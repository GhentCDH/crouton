import { z } from 'zod';

type ToJSONSchemaParams = NonNullable<
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  Parameters<typeof import('zod').toJSONSchema>[1]
>;
type OverrideContext = Parameters<
  NonNullable<ToJSONSchemaParams['override']>
>[0];

/** Post-process override: patch date schemas to `{ type: "string", format: "date-time" }`. */
const dateOverride = ({ zodSchema, jsonSchema }: OverrideContext) => {
  if (zodSchema instanceof z.ZodDate) {
    jsonSchema.type = 'string';
    jsonSchema.format = 'date-time';
  }
};

export const jsonSchemaOpts = {
  unrepresentable: 'any' as const,
  override: dateOverride,
};
