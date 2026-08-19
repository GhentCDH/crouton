import type { JsonSchema } from '@jsonforms/core';

type Field = { scope: string };

/**
 * Recursively drop nullable fields from `required`. A nullable field
 * (anyOf with a `{ type: "null" }` branch) should be treated as optional.
 */
export const dropNullableFromRequired = (schema: JsonSchema): JsonSchema => {
  if (!schema?.properties) return schema;

  const required = schema.required as string[] | undefined;
  if (!Array.isArray(required) || required.length === 0) return schema;

  const filteredRequired = required.filter((key) => {
    const prop = schema.properties![key];
    if (!prop || typeof prop !== 'object') return true;
    const anyOf = (prop as Record<string, unknown>)['anyOf'];
    return !(
      Array.isArray(anyOf) &&
      anyOf.some((s: Record<string, unknown>) => s?.['type'] === 'null')
    );
  });

  if (filteredRequired.length === required.length) return schema;

  return { ...schema, required: filteredRequired } as JsonSchema;
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
