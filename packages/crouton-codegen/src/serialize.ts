/**
 * serialize: deterministic text for the generated files.
 *
 * resource.json is emitted as 2-space JSON relying on object key insertion
 * order (the engine builds objects in a stable order and preserves existing
 * order when updating), so re-runs produce minimal git diffs and are idempotent.
 */

import { CURRENT_RESOURCE_VERSION, type ResourceJsonInput } from '@ghentcdh/crouton-core';

/** Canonical, versioned JSON Schema URL — matches the path published by the docs site. */
export const RESOURCE_SCHEMA_URL = `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/resource.schema.json`;

/**
 * Prepend `$schema` / `schemaVersion` (and, when set, `draft`) so every generated
 * `resource.json` validates + autocompletes in editors and is born at the current version.
 *
 * `$schema` and `schemaVersion` are always (re)stamped to current — any existing values are
 * dropped and re-added at the front for a stable, diff-friendly key order. `draft` is set from
 * `opts.draft` when provided (new-resource default), otherwise the config's existing `draft`
 * value is preserved (so an update never flips it).
 */
export const withResourceHeader = (
  config: ResourceJsonInput,
  opts: { draft?: boolean } = {},
): Record<string, unknown> => {
  const {
    $schema: _schema,
    schemaVersion: _version,
    draft: existingDraft,
    ...rest
  } = config as Record<string, unknown>;
  const draft = opts.draft !== undefined ? opts.draft : (existingDraft as boolean | undefined);

  return {
    $schema: RESOURCE_SCHEMA_URL,
    schemaVersion: CURRENT_RESOURCE_VERSION,
    ...(draft !== undefined ? { draft } : {}),
    ...rest,
  };
};

export const serializeResourceJson = (
  config: ResourceJsonInput | Record<string, unknown>,
): string => `${JSON.stringify(config, null, 2)}\n`;

/**
 * Content for a resource's `schema.ts` — a default re-export of the model's
 * generated Zod schema. `exportName` / `importPath` come from project config.
 */
export const serializeSchemaTs = (
  exportName: string,
  importPath: string,
): string =>
  `import { ${exportName} } from '${importPath}';\n\nexport default ${exportName};\n`;
