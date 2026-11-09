import type { JsonSchema } from '@jsonforms/core';

// "#/properties/speech/properties/name" → "speech.name"
export const scopeToPath = (scope: string): string => {
  if (!scope) return '';
  return scope
    .replace(/^#\//, '')
    .split('/')
    .filter((s) => s !== 'properties')
    .join('.');
};

// Walk schema along the scope to get the leaf schema
export const resolveSchema = (root: JsonSchema, scope: string): JsonSchema => {
  const segments = scope.replace(/^#\//, '').split('/').filter(Boolean);
  return segments.reduce<unknown>((acc, key) => (acc as Record<string, unknown> | null | undefined)?.[key], root) as JsonSchema;
};

// Derive a label from the scope tail: "properties/name" → "Name"
