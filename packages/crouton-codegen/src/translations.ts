/**
 * Build / maintain per-language translation bundles (`translations/<lang>.json`).
 *
 * Mirrors `enum-registry.ts`: one build, one merge, one serialize — the CLI
 * and `crouton update resources` call these to keep translation files in sync
 * with the current set of resources and enums.
 */

import type { ResourceJson, TranslationBundle } from '@ghentcdh/crouton-core';

import type { EnumRegistry } from './enum-registry';
import { labelFromId } from './naming';

// ── helpers ─────────────────────────────────────────────────────────

/** Recursively collect all dot-separated leaf paths from a nested object. */
const collectKeys = (
  obj: Record<string, unknown>,
  prefix = '',
): string[] => {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
};

/** Deep-get a string value, returning `undefined` for non-strings and empties. */
const getPath = (
  obj: Record<string, unknown>,
  path: string,
): string | undefined => {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === 'string' && cur !== '' ? cur : undefined;
};

/** Deep-set a value at a dot-separated path, creating intermediary objects. */
const setPath = (
  obj: Record<string, unknown>,
  path: string,
  value: string,
): void => {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null || typeof cur[k] !== 'object') {
      cur[k] = {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
};

// ── build ───────────────────────────────────────────────────────────

/**
 * Build a fresh translation bundle from the current set of resources and
 * enums. Every translatable label is seeded from the existing value in
 * `resource.json` (column.label, title, sidebar.label) or `labelFromId`.
 */
export const buildTranslationBundle = (
  resources: ResourceJson[],
  enums: EnumRegistry,
): TranslationBundle => {
  const bundle: TranslationBundle = {};

  // ── resources ──
  const resSection: Record<string, unknown> = {};
  for (const res of resources) {
    const entry: Record<string, unknown> = {};

    entry.title = res.title ?? labelFromId(res.name);

    if (res.sidebar?.label) {
      entry.sidebar = res.sidebar.label;
    }

    // columns
    if (res.columns?.length) {
      const cols: Record<string, string> = {};
      for (const col of res.columns) {
        cols[col.id] = col.label ?? labelFromId(col.id);
      }
      entry.columns = cols;
    }

    // actions + tableActions
    const allActions = [
      ...(res.actions ?? []),
      ...(res.tableActions ?? []),
    ];
    if (allActions.length) {
      const acts: Record<string, string> = {};
      for (const a of allActions) {
        acts[a.id] = a.label;
      }
      entry.actions = acts;
    }

    resSection[res.name] = entry;
  }
  if (Object.keys(resSection).length) {
    bundle.resources = resSection as TranslationBundle['resources'];
  }

  // ── enums ──
  if (Object.keys(enums).length) {
    const enumSection: Record<string, Record<string, string>> = {};
    for (const [name, opts] of Object.entries(enums)) {
      const members: Record<string, string> = {};
      for (const opt of opts) {
        members[opt.value] = opt.label;
      }
      enumSection[name] = members;
    }
    bundle.enums = enumSection;
  }

  return bundle;
};

// ── merge ───────────────────────────────────────────────────────────

/**
 * Merge a freshly generated bundle into an existing (hand-edited) one.
 *
 * - New keys are appended with the generated value (or empty for non-default
 *   languages — the caller controls that by passing a pre-emptied generated
 *   bundle).
 * - Existing non-empty values are **never** overwritten — hand edits win.
 * - Key order within each section is preserved (existing first, new appended).
 * - Keys present in `existing` but absent in `generated` are **kept** — use
 *   `findStaleKeys` + `--prune` to remove them explicitly.
 */
export const mergeTranslationBundle = (
  existing: TranslationBundle,
  generated: TranslationBundle,
): TranslationBundle => {
  const existingFlat = collectKeys(
    existing as unknown as Record<string, unknown>,
  );
  const generatedFlat = collectKeys(
    generated as unknown as Record<string, unknown>,
  );

  // Start from existing (preserves order + hand edits)
  const merged: Record<string, unknown> = JSON.parse(
    JSON.stringify(existing),
  );

  // Append new keys from generated
  for (const path of generatedFlat) {
    if (!existingFlat.includes(path)) {
      const value = getPath(
        generated as unknown as Record<string, unknown>,
        path,
      );
      setPath(merged, path, value ?? '');
    }
  }

  return merged as unknown as TranslationBundle;
};

// ── stale keys ──────────────────────────────────────────────────────

/**
 * Find keys present in `existing` but absent in `generated` — these
 * correspond to columns/enums/resources that no longer exist.
 */
export const findStaleKeys = (
  existing: TranslationBundle,
  generated: TranslationBundle,
): string[] => {
  const existingKeys = collectKeys(
    existing as unknown as Record<string, unknown>,
  );
  const generatedKeys = new Set(
    collectKeys(generated as unknown as Record<string, unknown>),
  );
  return existingKeys.filter((k) => !generatedKeys.has(k));
};

// ── serialize ───────────────────────────────────────────────────────

/** Serialize a bundle to JSON with stable key order and trailing newline. */
export const serializeTranslationBundle = (
  bundle: TranslationBundle,
): string => `${JSON.stringify(bundle, null, 2)}\n`;
