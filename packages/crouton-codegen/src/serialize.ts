/**
 * serialize: deterministic text for the generated files.
 *
 * resource.json is emitted as 2-space JSON relying on object key insertion
 * order (the engine builds objects in a stable order and preserves existing
 * order when updating), so re-runs produce minimal git diffs and are idempotent.
 */

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

export const serializeResourceJson = (config: ResourceJsonInput): string =>
  `${JSON.stringify(config, null, 2)}\n`;

/**
 * Content for a resource's `schema.ts` — a default re-export of the model's
 * generated Zod schema. `exportName` / `importPath` come from project config.
 */
export const serializeSchemaTs = (
  exportName: string,
  importPath: string,
): string =>
  `import { ${exportName} } from '${importPath}';\n\nexport default ${exportName};\n`;
