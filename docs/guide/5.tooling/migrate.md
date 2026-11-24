---
description: Upgrade a crouton project to a new release — crouton migrate rewrites resource.json files, crouton validate checks what is left.
---

# Upgrading crouton

During `0.x`, `resource.json` stays at **`schemaVersion: 1`** and its `$schema` URL stays
`https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json`. Breaking changes are described in a
per-release migration guide at the repository root, with the rule and a before/after example:

- [migrate-to-0.2.0.md](https://github.com/GhentCDH/crouton/blob/main/migrate-to-0.2.0.md) — `0.1.0` → `0.2.0`
  (hooks, filter coercion, generated Prisma client layout, frontend renderers).
- [migrate-to-next-alpha.md](https://github.com/GhentCDH/crouton/blob/main/migrate-to-next-alpha.md) — historical
  `0.0.1-alpha.N` → `0.1.0` upgrade.

`crouton migrate` applies the `resource.json` codemods for you. See
[Versioning](../2.resources/versioning.md) for what a release may change.

## Steps

1. Bump every `@ghentcdh/crouton-*` package to the same new version, then work through the matching migration guide
   for changes the codemods cannot make. For `0.2.0`, follow
   [migrate-to-0.2.0.md](https://github.com/GhentCDH/crouton/blob/main/migrate-to-0.2.0.md).
2. Preview, then apply the codemods:

   ```sh
   pnpm crouton migrate --dry-run   # lists, per file (sub-resources included), which rules apply
   pnpm crouton migrate             # asks once, then rewrites the files
   ```

   Every rule keeps the rendered result the same (positions become layout order, table defaults are spelled out
   when a layout has to be added, …). A file is only written when the result validates; the others are listed with
   the reason and left untouched. Running it again is a no-op.
3. Validate every resource:

   ```sh
   pnpm crouton validate
   ```

   Fix what is left by hand — the message names the guide section to follow. Repeat until it exits `0`.
4. Review the diff and commit the changed `resource.json` files.

| Command                     | Rewrites                                                                                   |
|-----------------------------|--------------------------------------------------------------------------------------------|
| `crouton migrate resources` | Every rule in the guide: root keys → `source` / `openapi` / `operations`, relation config, spellings, layout nodes, column presentation → layout items, `$schema` + `schemaVersion`. |
| `crouton migrate layout`    | Layout nodes only: `controls` → `items`, `actions` → `rowActions`, table search/filter fields → `operations.findAll`. |
| `crouton migrate`           | Both, in that order (the layout pass is then a no-op), then `init agents` to refresh `AGENTS.md` and the crouton skill to the installed version. |

All three take `--cwd`, `-p/--project`, `--dry-run` and `-y`.

::: tip Not covered by the codemods
Changes in application code (`json_schema`/`ui_schema` → `data`/`ui`, `applyResourceTagDescriptions`, the
`CustomRepository` row type) and unknown/misspelled column keys still need a manual edit — `crouton validate` and the
guide point them out.
:::

## Versioned migrations

The engine for future `schemaVersion` bumps also exists (`runResourceMigrations` in `@ghentcdh/crouton-core`,
auto-applied in dev — see [Versioning](../2.resources/versioning.md#auto-migration-on-load-dev-only)), but no step is
registered: within `0.x` the file stays at version `1`. `crouton migrate` runs its codemods regardless of the
version, so it works on any `0.x` file.
