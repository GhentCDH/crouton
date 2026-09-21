/**
 * serialize: deterministic text for the generated files.
 *
 * resource.json is emitted as 2-space JSON relying on object key insertion
 * order (the engine builds objects in a stable order and preserves existing
 * order when updating), so re-runs produce minimal git diffs and are idempotent.
 */

import { CURRENT_RESOURCE_VERSION, fieldInputRegistry, type ResourceJsonInput } from '@ghentcdh/crouton-core';

/** Canonical, versioned JSON Schema URL — matches the path published by the docs site. */
export const RESOURCE_SCHEMA_URL = `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}/resource.schema.json`;

const FIELD_INPUT_SCHEMA_BASE = `https://ghentcdh.github.io/crouton/schema/v${CURRENT_RESOURCE_VERSION}`;

const stampFieldInputSchema = (fi: Record<string, unknown>): Record<string, unknown> => {
  const type = fi.type as string | undefined;
  if (!type) return fi;
  const def = fieldInputRegistry.get(type);
  if (!def) return fi;
  const { $schema: _old, ...rest } = fi;
  return { $schema: `${FIELD_INPUT_SCHEMA_BASE}/${def.schemaFile}.field-input.schema.json`, ...rest };
};

/**
 * Prepend `$schema` / `schemaVersion` (and, when set, `draft` / `kind`) so every generated
 * `resource.json` validates + autocompletes in editors and is born at the current version.
 *
 * `$schema` and `schemaVersion` are always (re)stamped to current — any existing values are
 * dropped and re-added at the front for a stable, diff-friendly key order. `draft` is set from
 * `opts.draft` when provided (new-resource default), otherwise the config's existing `draft`
 * value is preserved (so an update never flips it). `kind` is preserved as-is and hoisted to a
 * fixed position; it is never inferred or removed, so an update cannot turn a custom resource
 * back into a prisma one.
 */
export const withResourceHeader = (
  config: ResourceJsonInput,
  opts: { draft?: boolean } = {},
): Record<string, unknown> => {
  const {
    $schema: _schema,
    schemaVersion: _version,
    draft: existingDraft,
    kind: existingKind,
    ...rest
  } = config as Record<string, unknown>;
  const draft = opts.draft !== undefined ? opts.draft : (existingDraft as boolean | undefined);

  if (Array.isArray((rest as Record<string, unknown>).columns)) {
    (rest as Record<string, unknown>).columns = (
      (rest as Record<string, unknown>).columns as Record<string, unknown>[]
    ).map((col) => {
      const out = { ...col };
      if (out['fieldInput'] && typeof out['fieldInput'] === 'object')
        out['fieldInput'] = stampFieldInputSchema(out['fieldInput'] as Record<string, unknown>);
      if (out['fieldView'] && typeof out['fieldView'] === 'object')
        out['fieldView'] = stampFieldInputSchema(out['fieldView'] as Record<string, unknown>);
      if (out['fieldTable'] && typeof out['fieldTable'] === 'object')
        out['fieldTable'] = stampFieldInputSchema(out['fieldTable'] as Record<string, unknown>);
      return out;
    });
  }

  return {
    $schema: RESOURCE_SCHEMA_URL,
    schemaVersion: CURRENT_RESOURCE_VERSION,
    ...(draft !== undefined ? { draft } : {}),
    ...(existingKind !== undefined ? { kind: existingKind } : {}),
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
