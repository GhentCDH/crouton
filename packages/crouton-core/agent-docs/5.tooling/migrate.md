---
description: Upgrade a crouton project to a new release — the migration guide, crouton migrate and crouton validate.
---

# Upgrading crouton

During `0.x`, `resource.json` stays at **`schemaVersion: 1`** and its `$schema` URL stays
`https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json`. Breaking changes to the file shape are not
migrated automatically: each one is described in the **migration guide**, `migrate-to-next-alpha.md`, with the rule
to apply and a before/after example. See [Versioning](../2.resources/versioning.md) for what a release may change.

## Steps

1. Bump every `@ghentcdh/crouton-*` package to the same new version.
2. Print the migration guide that matches the installed version:

   ```sh
   pnpm crouton migrate
   ```

   It prints `migrate-to-next-alpha.md`. Follow its sections yourself, or hand the whole file to your AI assistant —
   it is written for that (step-by-step workflow, grep checklist, common mistakes).
3. Validate every resource:

   ```sh
   pnpm crouton validate
   ```

   A key that moved fails with a message that names the guide section to follow. Repeat until it exits `0`.
4. Commit the changed `resource.json` files.

::: tip Find what needs changing
The guide ends with a grep checklist (`grep -rn '"position"' --include="resource.json" .` …) that lists every file a
section applies to.
:::

## Why no automatic migration in 0.x

The migration engine exists (`runResourceMigrations` in `@ghentcdh/crouton-core`, auto-applied in dev — see
[Versioning](../2.resources/versioning.md#auto-migration-on-load-dev-only)) but no step is registered: within `0.x`
the file stays at version `1`, so there is nothing to run. A future `schemaVersion` bump ships together with its
migration step.
