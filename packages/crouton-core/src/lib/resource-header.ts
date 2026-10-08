import type { ResourceJsonInput } from './resource/ResourceJson.schema';
import { fieldInputRegistry } from './resource/field-input/registry';
import { CURRENT_RESOURCE_VERSION } from './resource/version';

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
 * Prepend `$schema` / `schemaVersion` so every generated `resource.json` validates +
 * autocompletes in editors and is born at the current version.
 */
export const withResourceHeader = (
  config: ResourceJsonInput | Record<string, unknown>,
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
