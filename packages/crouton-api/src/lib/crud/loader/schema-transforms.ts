/**
 * Recursively set `additionalProperties: true` on every object in a JSON Schema.
 * Required so Prisma-returned rows (which may contain extra fields) pass validation.
 */
export const allowAdditionalProperties = (schema: Record<string, unknown>): void => {
  if (schema['type'] === 'object') {
    schema['additionalProperties'] = true;
    const props = schema['properties'] as Record<string, Record<string, unknown>> | undefined;
    if (props) {
      for (const value of Object.values(props)) {
        allowAdditionalProperties(value);
      }
    }
  }
  if (schema['type'] === 'array' && schema['items']) {
    allowAdditionalProperties(schema['items'] as Record<string, unknown>);
  }
};

/** A property is nullable when its `anyOf` contains a `{ type: "null" }` branch. */
const isNullableProperty = (prop: Record<string, unknown> | undefined): boolean => {
  const anyOf = prop?.['anyOf'];
  return (
    Array.isArray(anyOf) &&
    anyOf.some((s: Record<string, unknown>) => s?.['type'] === 'null')
  );
};

/**
 * Recursively drop nullable fields from `required`. A nullable field accepts
 * `null`, so it should be treated as optional rather than required.
 */
export const dropNullableFromRequired = (schema: Record<string, unknown>): void => {
  if (schema['type'] !== 'object') return;

  const props = schema['properties'] as Record<string, Record<string, unknown>> | undefined;
  if (!props) return;

  const required = schema['required'] as string[] | undefined;
  if (Array.isArray(required)) {
    schema['required'] = required.filter((key) => !isNullableProperty(props[key]));
  }

  for (const value of Object.values(props)) {
    dropNullableFromRequired(value);
  }
};

/** Add `minLength: 1` to all string properties so empty strings are rejected. */
export const enforceRequiredMinLength = (schema: Record<string, unknown>): void => {
  if (schema['type'] !== 'object') return;

  const props = schema['properties'] as Record<string, Record<string, unknown>> | undefined;
  if (!props) return;

  for (const prop of Object.values(props)) {
    if (prop?.['type'] === 'string' && !('minLength' in prop)) {
      prop['minLength'] = 1;
    } else if (prop?.['type'] === 'object') {
      enforceRequiredMinLength(prop);
    }
  }
};
