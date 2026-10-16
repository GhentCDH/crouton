---
description: crouton migrate — automated codemod for upgrading resource.json files and syncing agent files.
---

# Migrations

The `crouton migrate` command transforms `resource.json` files automatically and keeps your agent files (Claude skill, Cursor rule, `AGENTS.md` block) in sync with the installed crouton version.

## `crouton migrate`

Applies all pending migrations:

- Schema-version bumps (when `CURRENT_RESOURCE_VERSION` is incremented)
- **Layout precedence fix** — makes existing layouts exhaustive so the rendered output stays the same after the layout-wins change:
  - Appends visible (not-hidden-by-flag) columns that are missing from the layout for each defined context
  - Removes columns listed in the layout that have `hiddenIn<Ctx>: true` (old code dropped them; new code shows them)
- **Search fields migration** — moves deprecated search configuration to `operations.findAll.search`:
  - `layout.table.searchFields: [...]` → `operations.findAll.search`
  - Column-level `searchable: true` → `operations.findAll.search`
- **Deprecated column fields** — removes fields superseded by layout:
  - `col.fieldView` — deleted; use `layout.view.items[{ id, type, options }]` instead
  - `col.columnType` — deleted; use the top-level `col.type` field instead

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

### Flags

| Flag | Description |
|---|---|
| `--dry-run` | Print a diff of what would change; do not write files. |
| `--check` | Exit 1 if any file needs migration or agent files are out of date (useful in CI). |
| `--no-agent-files` | Only migrate `resource.json` files; skip agent file sync. |
| `--agent-files-only` | Only sync agent files; skip `resource.json` migration. |
| `--targets claude,cursor` | Which agent file sets to sync (default: those already present, or both on first run). |
| `--force` | Overwrite agent files even if they were edited locally. |
| `[paths...]` | One or more file or directory paths to scan (default: `resourcesDir` from `crouton.json`). |

### When to run

Run after upgrading `@ghentcdh/crouton-core` to a version that introduces breaking layout or schema changes. The schema validator will tell you when migration is needed.

---

## Agent files

`crouton migrate` also keeps your AI agent files in sync with the installed crouton version. This ensures agents always write resources in the current schema shape.

### What is synced

| File | Description |
|---|---|
| `.claude/skills/crouton/SKILL.md` | Main crouton skill for Claude Code. Includes YAML frontmatter with `crouton-version`. |
| `.claude/skills/crouton/references/*.md` | Reference files: `resource-json.md`, `relations.md`, `field-inputs.md`, `data-sources.md`, `recipes.md`, `common-mistakes.md`. |
| `.cursor/rules/crouton.mdc` | Cursor rule equivalent. |
| `AGENTS.md` (crouton block) | The `<!-- crouton configuration -->` block. |

### Safe updates

A manifest at `.crouton/agent-files.json` tracks what crouton last wrote. The update logic per file:

- **File missing** → written.
- **Hash matches manifest** (untouched since last crouton write) → overwritten with the new version.
- **Hash differs** (you edited it) → skipped; the new version is written to `.crouton/agent-files/<name>.new` and reported. Use `--force` to overwrite.
- **File crouton no longer ships** → deleted if untouched, reported if edited.

### Project-specific notes

Put project conventions in `.claude/skills/crouton/project.md`. Crouton never touches this file. The skill links to it automatically if it exists.

### `crouton.json` configuration

After the first run, crouton stores the chosen targets in `crouton.json`:

```json
{
  "agentFiles": { "targets": ["claude", "cursor"] }
}
```

Change or remove this to adjust which sets are managed.
