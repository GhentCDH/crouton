import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
  type FieldInput,
  type FieldVariant,
  mergeFieldVariant,
  ResourceJsonSchema,
} from '@ghentcdh/crouton-core';

import type {
  PatchColumn,
  PatchResourceJson,
} from './PatchResourceJson.schema';

/**
 * Backs the visual resource builder's `PATCH <route>/resource.json` endpoint.
 *
 * Deliberately does NOT reuse `readResourceJson` (`ReadResourceJson.ts`) for the
 * read side: that helper runs the file through `ResourceJsonSchema`, whose
 * `.transform()` normalizes `columns` from map-form to an array and fills in
 * every default. Round-tripping through it would silently rewrite a hand-written
 * map-form resource.json into array form and inject defaults for every
 * untouched field — the opposite of the "leave every untouched key byte-stable"
 * goal (see `VISUAL_RESOURCE_BUILDER_PLAN.md`, Phase 1). Instead this module
 * reads the raw JSON, patches only the touched leaf fields, and writes the
 * result back verbatim. `ResourceJsonSchema` is still used, but only to
 * *validate* the merged result before writing — never to shape what's written.
 */
export type RawResourceJson = Record<string, unknown>;

export const readRawResourceJson = (
  jsonPath: string,
): RawResourceJson | undefined => {
  if (!existsSync(jsonPath)) return undefined;
  return JSON.parse(readFileSync(jsonPath, 'utf-8'));
};

const FIELD_VARIANT_KEYS = ['fieldInput', 'fieldView', 'fieldTable'] as const;
type FieldVariantKey = (typeof FIELD_VARIANT_KEYS)[number];

/**
 * Merges each of `fieldInput`/`fieldView`/`fieldTable` present on the patch
 * into the column's existing raw value for that key, via crouton-core's
 * `mergeFieldVariant` — the same function that resolves the
 * `fieldInput → fieldView → fieldTable` fallback chain elsewhere, so a patch
 * follows identical "deep-merge one level into `options`, `null` deletes an
 * inherited key" semantics instead of a second bespoke implementation.
 */
const mergeColumn = (
  existing: Record<string, unknown>,
  patch: PatchColumn,
): Record<string, unknown> => {
  const { fieldInput, fieldView, fieldTable, ...rest } = patch;
  const variantPatches: Partial<Record<FieldVariantKey, unknown>> = {
    fieldInput,
    fieldView,
    fieldTable,
  };

  const merged: Record<string, unknown> = { ...existing, ...rest };
  for (const key of FIELD_VARIANT_KEYS) {
    const variantPatch = variantPatches[key];
    if (!variantPatch) continue;
    merged[key] = mergeFieldVariant(
      existing[key] as FieldInput | undefined,
      variantPatch as FieldVariant,
    );
  }
  return merged;
};

/**
 * Applies a column patch to a raw (untransformed) resource.json object,
 * preserving whichever column shape (id-keyed map or array) the file already
 * uses, and leaving every other top-level key and every untouched column
 * field byte-stable. Only patches columns that already exist — the visual
 * builder's MVP does not add or remove columns (see optional phases in
 * `VISUAL_RESOURCE_BUILDER_PLAN.md`).
 */
export const applyColumnPatch = (
  raw: RawResourceJson,
  patch: PatchResourceJson,
): RawResourceJson => {
  const columns = raw['columns'];

  if (Array.isArray(columns)) {
    const updated = columns.map((col: Record<string, unknown>) => {
      const columnPatch = patch.columns[col['id'] as string];
      return columnPatch ? mergeColumn(col, columnPatch) : col;
    });
    return { ...raw, columns: updated };
  }

  if (columns && typeof columns === 'object') {
    const updated: Record<string, unknown> = { ...columns };
    for (const [id, columnPatch] of Object.entries(patch.columns)) {
      if (!(id in updated)) continue;
      updated[id] = mergeColumn(
        updated[id] as Record<string, unknown>,
        columnPatch,
      );
    }
    return { ...raw, columns: updated };
  }

  return raw;
};

/**
 * Mirrors `@ghentcdh/crouton-codegen`'s `serializeResourceJson` (2-space JSON,
 * trailing newline, relies on object key insertion order for minimal diffs).
 * Kept inline here rather than adding crouton-api's first runtime dependency
 * on crouton-codegen (which brings in `@prisma/internals`) for a one-line
 * formatter — see the "reuse" note in `VISUAL_RESOURCE_BUILDER_PLAN.md`.
 */
export const serializeResourceJson = (config: unknown): string =>
  `${JSON.stringify(config, null, 2)}\n`;

/** Validates a merged raw resource.json before it's written to disk. */
export const validateResourceJson = (raw: unknown) =>
  ResourceJsonSchema.safeParse(raw);

export const writeRawResourceJson = (
  jsonPath: string,
  raw: RawResourceJson,
): void => {
  writeFileSync(jsonPath, serializeResourceJson(raw), 'utf-8');
};
