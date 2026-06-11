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

/** Add `minLength: 1` to required string properties so empty strings are rejected. */
export const enforceRequiredMinLength = (schema: Record<string, unknown>): void => {
  if (schema['type'] !== 'object') return;

  const required = schema['required'] as string[] | undefined;
  const props = schema['properties'] as Record<string, Record<string, unknown>> | undefined;
  if (!required?.length || !props) return;

  for (const key of required) {
    const prop = props[key];
    if (prop?.['type'] === 'string' && !('minLength' in prop)) {
      prop['minLength'] = 1;
    }
  }

  if (props) {
    for (const value of Object.values(props)) {
      enforceRequiredMinLength(value);
    }
  }
};
