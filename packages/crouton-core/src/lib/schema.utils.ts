import type { JsonSchema } from '@jsonforms/core';

type Field = { scope: string };

export const enforceRequiredStringMinLength = (schema: JsonSchema): JsonSchema => {
  if (!schema?.properties) return schema;
  const required: string[] = (schema as any).required ?? [];
  const patchedProperties = { ...schema.properties };
  let changed = false;
  for (const key of required) {
    const prop = patchedProperties[key];
    if (!prop || typeof prop !== 'object') continue;
    if (prop.type === 'string' && prop.minLength === undefined) {
      patchedProperties[key] = { ...prop, minLength: 1 };
      changed = true;
    }
  }
  for (const key of Object.keys(patchedProperties)) {
    const prop = patchedProperties[key];
    if (prop && typeof prop === 'object' && prop.type === 'object') {
      const patched = enforceRequiredStringMinLength(prop as JsonSchema);
      if (patched !== prop) { patchedProperties[key] = patched; changed = true; }
    }
  }
  return changed ? ({ ...schema, properties: patchedProperties } as JsonSchema) : schema;
};

export const findProperty = <F extends Field>(column: F, schema: JsonSchema) => {
  if (!column.scope) return { id: null, property: null };
  const id = column.scope?.substring('#/properties/'.length);
  const property = schema?.properties?.[id] ?? {};
  return { id, property } as { id: string; property: any };
};
