/**
 * serialize: deterministic text for the generated files.
 *
 * resource.json is emitted as 2-space JSON relying on object key insertion
 * order (the engine builds objects in a stable order and preserves existing
 * order when updating), so re-runs produce minimal git diffs and are idempotent.
 */

// Re-export from crouton-core so callers that import from crouton-codegen continue to work.
export {
  RESOURCE_SCHEMA_URL,
  serializeResourceJson,
  withResourceHeader,
} from '@ghentcdh/crouton-core';

/**
 * Content for a resource's `schema.ts` — a default re-export of the model's
 * generated Zod schema. `exportName` / `importPath` come from project config.
 */
export const serializeSchemaTs = (
  exportName: string,
  importPath: string,
): string =>
  `import { ${exportName} } from '${importPath}';\n\nexport default ${exportName};\n`;
