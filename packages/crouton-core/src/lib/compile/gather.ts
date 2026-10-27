import type { ZodObject, ZodRawShape } from 'zod';

import type { EnumRegistry } from './enum-registry';
import type { CompileEnv } from './env';
import type { ModelSchema, ResourceInput, ResourceRef } from './model';
import { toJsonSchema } from './to-json-schema';

const REMOTE_RESOURCE = /^https?:\/\//i;

/**
 * Extract all local resource paths/routes referenced by columns in a raw resource JSON.
 * Returns relative paths (e.g. "./author.resource") or route names ("authors").
 */
const extractResourcePaths = (json: any): string[] => {
  const paths: string[] = [];
  const raw = json.columns ?? {};
  const cols: any[] = Array.isArray(raw) ? raw : Object.values(raw);

  for (const col of cols) {
    if (!col || typeof col !== 'object') continue;

    // extend column: loads a sibling resource to expand its columns
    if (typeof col.extend === 'string') {
      paths.push(col.extend);
    }

    // relation column: new `relation` field or legacy `fieldInput`
    const resource =
      col.relation?.resource ?? col.fieldInput?.resource;
    if (typeof resource === 'string' && !REMOTE_RESOURCE.test(resource)) {
      paths.push(resource);
    }
  }

  return [...new Set(paths)];
};

/**
 * Convert a Zod object schema to a serializable ModelSchema.
 *
 * Uses `toJsonSchema` (which already handles Zod v4 → JSON Schema conversion)
 * and extracts properties + required from the result.
 */
export const zodToModelSchema = (
  schema: ZodObject<ZodRawShape>,
): ModelSchema => {
  const jsonSchema = toJsonSchema(schema) as any;
  return {
    properties: jsonSchema.properties ?? {},
    required: jsonSchema.required ?? [],
    relations: undefined,
  };
};

/**
 * Gather everything normalizeResource needs into a plain ResourceInput.
 *
 * Takes a pre-loaded raw resource JSON and an env that knows how to resolve
 * sibling resources and their Zod schemas. The env is the only platform-specific
 * part — the rest of this function is pure and browser-safe.
 *
 * @param resource - Raw resource.json contents (unknown; validated in stage 2.0).
 * @param env - Platform env: resolves sibling resource.json + Zod schemas.
 * @param enums - Enum registry loaded from crouton.enums.json (caller's responsibility).
 */
export const gatherInput = async (
  resource: unknown,
  env: CompileEnv,
  enums: EnumRegistry = {},
): Promise<ResourceInput> => {
  const json = resource as any;
  const paths = extractResourcePaths(json);
  const refs: Record<string, ResourceRef> = {};

  for (const path of paths) {
    const refJson = await env.resolveResource(path);
    if (!refJson) continue;
    const route = (refJson as any).route ?? path;
    if (route in refs) continue;

    const refSchema = await env.resolveSchema(route);
    const refModel = refSchema ? zodToModelSchema(refSchema) : undefined;
    refs[route] = { resource: refJson, model: refModel };
  }

  const routeName = typeof json.route === 'string' ? json.route : '';
  const schema = routeName ? await env.resolveSchema(routeName) : undefined;
  const model = schema ? zodToModelSchema(schema) : undefined;

  return {
    resource,
    model,
    refs,
    enums,
    baseUrl: env.baseUrl,
  };
};

/**
 * A memory-backed CompileEnv for testing.
 * Takes pre-loaded resource JSONs and Zod schemas, resolving by route name.
 */
export const makeMemoryEnv = (
  resources: Record<string, unknown> = {},
  schemas: Record<string, ZodObject<ZodRawShape>> = {},
  baseUrl?: string,
): CompileEnv => ({
  resolveResource: async (routeOrPath: string) => {
    // Try direct route lookup first, then strip path conventions
    if (routeOrPath in resources) return resources[routeOrPath] as any;
    // Strip ./ prefix and .resource suffix from paths like "./author.resource"
    const route = routeOrPath
      .replace(/^\.\//, '')
      .replace(/\.resource$/, '')
      .replace(/\/resource\.json$/, '');
    return (resources[route] as any) ?? undefined;
  },
  resolveSchema: async (route: string) => schemas[route],
  baseUrl,
});
