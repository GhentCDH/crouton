/**
 * Load-time migration for a single `resource.json`.
 *
 * Auto-migration is a DEV-ONLY capability: it rewrites the checked-in file, so it needs a
 * writable, version-controlled checkout (the diff is meant to be reviewed and committed).
 * Outside dev, an out-of-date file is reported as a failure rather than silently rewritten
 * or run against stale config — the normal flow is that dev migrates + commits, so prod only
 * ever sees files already at `CURRENT_RESOURCE_VERSION`.
 *
 * Operates on the RAW object (via `WriteResourceJson`'s raw-preserving helpers) so a rewrite
 * stays a minimal, byte-stable diff; validation with Zod happens only after migrating.
 */

import {
  BASELINE_RESOURCE_VERSION,
  CURRENT_RESOURCE_VERSION,
  MigrationPathError,
  MigrationStepError,
  resourceVersionOf,
  runResourceMigrations,
} from '@ghentcdh/crouton-core';

import {
  readRawResourceJson,
  serializeResourceJson,
  validateResourceJson,
} from './WriteResourceJson';
import { writeFileSync } from 'node:fs';

export type MigrateOutcome =
  | { status: 'current'; version: number }
  | { status: 'migrated'; from: number; to: number; written: boolean }
  | { status: 'failed'; version: number; expected: number; error: string };

export const migrateResourceJsonFile = (
  jsonPath: string,
  opts: { isDev: boolean },
): MigrateOutcome => {
  // If the file is missing or not valid JSON, don't fail here — pass through so the normal
  // reader (`readResourceJson`) reports the parse error verbatim, exactly as before.
  let raw: Record<string, unknown> | undefined;
  try {
    raw = readRawResourceJson(jsonPath);
  } catch {
    return { status: 'current', version: BASELINE_RESOURCE_VERSION };
  }
  if (!raw) return { status: 'current', version: BASELINE_RESOURCE_VERSION };

  const from = resourceVersionOf(raw);
  if (from === CURRENT_RESOURCE_VERSION) {
    return { status: 'current', version: from };
  }

  // Out of date (or newer). Migration only runs in the dev environment.
  if (!opts.isDev) {
    return {
      status: 'failed',
      version: from,
      expected: CURRENT_RESOURCE_VERSION,
      error:
        `resource.json is version ${from} but crouton expects ${CURRENT_RESOURCE_VERSION}; ` +
        'auto-migration only runs in the dev environment — run crouton in dev to upgrade and commit it',
    };
  }

  try {
    const result = runResourceMigrations(raw);
    const validation = validateResourceJson(result.raw);
    if (!validation.success) {
      return {
        status: 'failed',
        version: from,
        expected: CURRENT_RESOURCE_VERSION,
        error: `migrated resource.json (v${from}→v${result.to}) is invalid: ${validation.error.message}`,
      };
    }
    writeFileSync(jsonPath, serializeResourceJson(result.raw), 'utf-8');
    return { status: 'migrated', from: result.from, to: result.to, written: true };
  } catch (err) {
    // MigrationPathError / MigrationStepError (or anything unexpected) → surfaced on status page.
    const error =
      err instanceof MigrationPathError || err instanceof MigrationStepError
        ? (err as Error).message
        : `migration failed: ${(err as Error).message}`;
    return { status: 'failed', version: from, expected: CURRENT_RESOURCE_VERSION, error };
  }
};
