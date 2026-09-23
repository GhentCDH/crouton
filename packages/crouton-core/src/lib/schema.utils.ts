/**
 * Browser-safe JSON Schema utilities shared across crouton-core and crouton-api.
 *
 * Keep this file free of Node-only imports. Zod-specific conversion lives in
 * compile/to-json-schema.ts; mutable view-build transforms live in
 * view/schema-transforms.ts.
 */

import type { JsonSchema } from '@jsonforms/core';

type Field = { scope: string };

/**
 * Returns true when a JSON Schema property represents a nullable field.
 * Handles both Zod v4 (`"type": ["string","null"]`) and the older
 * anyOf `[{type:"string"},{type:"null"}]` format.
 */
export const isNullableProperty = (property: unknown): boolean => {
  const prop = property as Record<string, unknown> | undefined;
  if (!prop) return false;
  if (Array.isArray(prop['type']) && (prop['type'] as string[]).includes('null')) return true;
  const anyOf = prop['anyOf'];
  return Array.isArray(anyOf) && anyOf.some((s: Record<string, unknown>) => s?.['type'] === 'null');
};

/**
 * Recursively drop nullable fields from `required`. A nullable field
 * (anyOf with a `{ type: "null" }` branch) should be treated as optional.
 */
export const dropNullableFromRequired = (schema: JsonSchema): JsonSchema => {
  if (!schema?.properties) return schema;

  const required = schema.required as string[] | undefined;
  if (!Array.isArray(required) || required.length === 0) return schema;

  const filteredRequired = required.filter(
    (key) => !isNullableProperty(schema.properties![key]),
  );

  if (filteredRequired.length === required.length) return schema;

  return { ...schema, required: filteredRequired } as JsonSchema;
};

/**
 * For every property NOT in the schema's `required` array, add `null` to its
 * allowed types. This prevents Zod (via `fromJSONSchema`) from emitting a type
 * error — mapped to "This field is required" — when an optional field's current
 * value is `null`.
 */
export const makeOptionalPropertiesNullable = (schema: JsonSchema): JsonSchema => {
  if (!schema?.properties) return schema;
  const requiredSet = new Set<string>(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );
  const patched = { ...schema.properties };
  let changed = false;
  for (const key of Object.keys(patched)) {
    if (requiredSet.has(key)) continue;
    const prop = patched[key];
    if (!prop || typeof prop !== 'object') continue;
    if (isNullableProperty(prop)) continue;
    const type = (prop as Record<string, unknown>)['type'];
    if (typeof type === 'string' && type !== 'null') {
      patched[key] = { ...prop, type: [type, 'null'] } as JsonSchema;
      changed = true;
    }
  }
  return changed ? ({ ...schema, properties: patched } as JsonSchema) : schema;
};

export const enforceRequiredStringMinLength = (schema: JsonSchema): JsonSchema => {
  if (!schema?.properties) return schema;
  const patchedProperties = { ...schema.properties };
  let changed = false;
  for (const key of Object.keys(patchedProperties)) {
    const prop = patchedProperties[key];
    if (!prop || typeof prop !== 'object') continue;
    if (prop.type === 'string' && prop.minLength === undefined) {
      patchedProperties[key] = { ...prop, minLength: 1 };
      changed = true;
    } else if (prop.type === 'object') {
      const patched = enforceRequiredStringMinLength(prop as JsonSchema);
      if (patched !== prop) { patchedProperties[key] = patched; changed = true; }
    }
  }
  return changed ? ({ ...schema, properties: patchedProperties } as JsonSchema) : schema;
};

/**
 * Resolve a column's scope to its schema property.
 *
 * Scopes may be nested (`#/properties/author/properties/name`, produced for
 * `extend` columns and inline object types). Previously only the
 * `#/properties/` prefix was stripped, so a nested scope yielded the id
 * `"author/properties/name"` and an empty property — leaving such columns with
 * no schema type at all. Each `properties/<key>` segment is now walked.
 */
export const findProperty = <F extends Field>(column: F, schema: JsonSchema) => {
  if (!column.scope) return { id: null, property: null };
  const id = column.scope.substring('#/properties/'.length);
  const segments = id.split('/properties/');

  let property: any = schema?.properties?.[segments[0]] ?? {};
  for (const segment of segments.slice(1)) {
    property = property?.properties?.[segment] ?? {};
  }

  return { id, property } as { id: string; property: any };
};
