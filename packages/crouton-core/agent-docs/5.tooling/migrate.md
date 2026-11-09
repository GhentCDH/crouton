---
description: Migrate resource.json files between schema versions using nx migrate.
---

# Migrating resource.json with nx migrate

Crouton ships Nx migration steps alongside releases that change the `resource.json` schema.
Running `nx migrate` applies them automatically — the same way you'd migrate any Nx plugin.

```sh
pnpm nx migrate @ghentcdh/crouton-cli
pnpm nx migrate --run-migrations
```

The first command downloads the migration list and writes `migrations.json`. The second runs every pending step, rewrites all affected `resource.json` files in-place, and prints which files were changed.

::: warning Alpha — no migrations yet
`resource.json` is still at **schemaVersion 1** during the alpha. No migration steps are active yet. The commands above are safe to run but will produce an empty `migrations.json`. This page documents the mechanism for when v2 is released.
:::

::: tip Auto-migration in dev
If `CROUTON_SCHEMA_EDITOR=true`, crouton auto-migrates on load in dev. `nx migrate` is for CI and production checkouts where the dev loader is not running. See [Versioning](../2.resources/versioning.md).
:::

## v1 → v2

This step rewrites the structural parts of `resource.json` layout nodes. It is safe to run on any file, including already-migrated ones — a file at v2 is left unchanged.

### What changes

| Old (v1) | New (v2) | Notes |
|---|---|---|
| `controls` | `items` | `controls` is merged into `items` (controls first, then existing items). |
| `layout.table.actions` | `layout.table.rowActions` | Rename only; no other change. |
| `layout.table.tableActions`, `searchFields`, `filterFields` at wrapper level | Moved onto the inner `type: "table"` node | Only when an explicit table node exists inside the layout. |

### Example

```json
// Before (v1)
{
  "schemaVersion": 1,
  "layout": {
    "table": {
      "controls": [{ "type": "Control", "scope": "#/properties/title" }],
      "actions": [{ "type": "edit" }],
      "tableActions": [{ "type": "create" }]
    }
  }
}
```

```json
// After (v2)
{
  "schemaVersion": 2,
  "layout": {
    "table": {
      "items": [{ "type": "Control", "scope": "#/properties/title" }],
      "rowActions": [{ "type": "edit" }],
      "tableActions": [{ "type": "create" }]
    }
  }
}
```
