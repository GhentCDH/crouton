/**
 * The resource.json migration engine.
 *
 * `MIGRATIONS` is an ordered, contiguous chain of single-version steps. `runResourceMigrations`
 * upgrades a raw object from its current `schemaVersion` up to a target (default
 * `CURRENT_RESOURCE_VERSION`), applying each step in turn. It is pure — no fs, no env — so it
 * can be unit-tested in isolation and reused by both the API loader and the CLI.
 */

import { BASELINE_RESOURCE_VERSION, CURRENT_RESOURCE_VERSION } from '../version';
import {
  MigrationPathError,
  type MigrationResult,
  MigrationStepError,
  type RawResourceJson,
  type ResourceMigration,
} from './types';

/**
 * Ordered, contiguous migration steps. Append one (`from: N, to: N + 1`) every time
 * `CURRENT_RESOURCE_VERSION` is bumped. A gap is a programming error caught by the spec.
 */
export const MIGRATIONS: ResourceMigration[] = [
  // Example (add when the first real shape change lands and CURRENT_RESOURCE_VERSION becomes 2):
  // migration_0001to0002,
];

/** Read a raw object's version, treating a missing/invalid field as the baseline. */
export const resourceVersionOf = (raw: RawResourceJson): number => {
  const v = raw['schemaVersion'];
  return typeof v === 'number' && Number.isInteger(v) ? v : BASELINE_RESOURCE_VERSION;
};

/**
 * Upgrade `raw` from its current version up to `target`.
 *
 * - Already at `target` → returns it unchanged (no `schemaVersion` rewrite), `applied: []`.
 * - Newer than `target` → `MigrationPathError` (crouton is too old; never down-migrate).
 * - A gap with no registered step → `MigrationPathError`.
 * - A step throws → `MigrationStepError`.
 *
 * On success the returned object leads with `schemaVersion: target` for a readable diff.
 */
export const runResourceMigrations = (
  raw: RawResourceJson,
  target: number = CURRENT_RESOURCE_VERSION,
  migrations: ResourceMigration[] = MIGRATIONS,
): MigrationResult => {
  const from = resourceVersionOf(raw);

  if (from === target) return { raw, from, to: target, applied: [] };

  if (from > target) {
    throw new MigrationPathError(
      `resource.json is version ${from} but this crouton only understands up to ${target} — upgrade crouton`,
    );
  }

  let current = raw;
  const applied: string[] = [];

  for (let v = from; v < target; v++) {
    const step = migrations.find((m) => m.from === v && m.to === v + 1);
    if (!step) {
      throw new MigrationPathError(`no migration path from version ${v} to ${v + 1}`);
    }
    try {
      current = step.migrate(current);
    } catch (err) {
      throw new MigrationStepError(
        `migration ${v}→${v + 1} (${step.description}) failed: ${(err as Error).message}`,
      );
    }
    applied.push(step.description);
  }

  // Lead with schemaVersion so the written file is diff-friendly.
  const { schemaVersion: _old, ...rest } = current;
  return { raw: { schemaVersion: target, ...rest }, from, to: target, applied };
};

export * from './types';
