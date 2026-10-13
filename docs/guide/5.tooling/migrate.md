---
description: crouton migrate — automated codemod for upgrading resource.json files between schema versions.
---

# Migrations

The `crouton migrate` command transforms `resource.json` files to a newer schema version automatically.

## `crouton migrate layout`

Migrates `resource.json` files from schema v1 to v2:

- `controls` → `items` on every layout node (preserving render order)
- `actions` → `rowActions` on table nodes and sub-resources
- Moves `actions`, `tableActions`, `searchFields`, `filterFields` from wrapper roots to the inner `type: "table"` node
- Bumps `schemaVersion` to `2`

```bash
# Preview changes without writing
crouton migrate layout --dry-run

# Apply to all resource.json files in the configured resourcesDir
crouton migrate layout

# Apply to a specific directory or file
crouton migrate layout src/resources/

# CI: exit 1 if any file needs migration
crouton migrate layout --check
```

### Flags

| Flag | Description |
|---|---|
| `--dry-run` | Print a diff of what would change; do not write files. |
| `--check` | Exit 1 if any file needs migration (useful in CI). |
| `[paths...]` | One or more file or directory paths to scan (default: `resourcesDir` from `crouton.json`). |

The transform is **idempotent** — running it twice produces no further diff.

### When to run

Run after upgrading `@ghentcdh/crouton-core` to a version that requires `schemaVersion: 2`. The schema validator will tell you which files need migration via a clear error:

```
Error: 'controls' was removed — use 'items'. Run 'crouton migrate layout'.
```
