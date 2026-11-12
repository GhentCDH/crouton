---
description: What is planned after the first crouton release, and what 0.1.0 deliberately does not include.
---

# Roadmap

Planned after `0.1.0`. Nothing here is promised for a specific release.

## User-facing

- **Layout-aware visual editor.** The dev-mode canvas currently shows fields in column order and edits their type
  and visibility. Reordering and resizing fields (which now live in `layout.<ctx>.items`) returns with an editor that
  writes layout items directly, and that shows when a context's visibility is controlled by its layout.
- **Automatic `resource.json` migrations.** The file stays at `schemaVersion: 1` during `0.x`; changes are applied
  with the [migration guide](5.tooling/migrate.md). The next `schemaVersion` ships with a migration step that runs
  automatically in dev.
- **More published packages.** `@ghentcdh/add-crouton` (add crouton to an existing project) and `@ghentcdh/crouton-mcp`
  (MCP server for LLM agents) are not on npm yet.

## Internal (no change for users)

- Consolidate the core/API modules: one operation registry, one compile-payload module, no duplicated helpers.
- Move all layout logic behind a single `layout/` module entry.
- Finish moving shared code from `packages/` to `libs/`.
- Guard against duplicated code in CI.
