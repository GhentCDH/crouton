---
description: crouton migrate — automated codemod for upgrading resource.json files.
---

# Migrations

The `crouton migrate` command transforms `resource.json` files automatically.

## `crouton migrate`

Applies all pending migrations:

- Schema-version bumps (when `CURRENT_RESOURCE_VERSION` is incremented)
- **Layout precedence fix** — makes existing layouts exhaustive so the rendered output stays the same after the layout-wins change:
  - Appends visible (not-hidden-by-flag) columns that are missing from the layout for each defined context
  - Removes columns listed in the layout that have `hiddenIn<Ctx>: true` (old code dropped them; new code shows them)

```bash
# Preview changes without writing
crouton migrate --dry-run

# Apply to all resource.json files in the configured resourcesDir
crouton migrate

# Apply to a specific directory or file
crouton migrate src/resources/

# CI: exit 1 if any file needs migration
crouton migrate --check
```

### Flags

| Flag | Description |
|---|---|
| `--dry-run` | Print a diff of what would change; do not write files. |
| `--check` | Exit 1 if any file needs migration (useful in CI). |
| `[paths...]` | One or more file or directory paths to scan (default: `resourcesDir` from `crouton.json`). |

The transform is **idempotent** — running it twice produces no further diff.

### When to run

Run after upgrading `@ghentcdh/crouton-core` to a version that introduces breaking layout or schema changes. The schema validator will tell you when migration is needed.
