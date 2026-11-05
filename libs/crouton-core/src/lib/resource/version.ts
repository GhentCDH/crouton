/**
 * resource.json schema versioning.
 *
 * `schemaVersion` is a monotonic integer stamped on every `resource.json`. It is
 * **decoupled from the crouton package semver** on purpose — bump it only when the
 * resource.json *shape* changes in a way that needs a migration, and ship a matching
 * step in `./migrations`. This keeps the migration chain one-step-per-bump with no
 * version-range math.
 *
 * Files written before versioning existed carry no field and are treated as the
 * baseline. Because `CURRENT_RESOURCE_VERSION` starts equal to the baseline, shipping
 * the versioning machinery is a pure no-op for every existing file until the first
 * real shape change lands (`CURRENT_RESOURCE_VERSION = 2` + a `1 → 2` migration).
 */

/** Version assumed for a `resource.json` that has no `schemaVersion` field. */
export const BASELINE_RESOURCE_VERSION = 1;

/**
 * The version the running crouton understands. Bump by 1 whenever resource.json's
 * shape changes, and add a migration step (`from: N, to: N + 1`) in `./migrations`.
 */
export const CURRENT_RESOURCE_VERSION = 1;
