# Task: Configure how this resource labels itself in other resources' dropdowns

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists. The book resource has columns `title`, `isbn`, and `authorId`. When books appear in another resource's autocomplete dropdown, they currently show only the `id`.

## Your task

Update `src/resources/book/resource.json` so that:

1. Books show as `"Title · ISBN"` in other resources' dropdowns
2. The separator is `" · "` (space, middot, space)
3. Remove any `showInLookup: true` flags from individual columns (that key is removed)

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

Also verify with `crouton migrate --check` — must exit 0.

## Hints

- `lookup.labels` is a resource-level array of column ids (ordered)
- `lookup.separator` sets the separator string
- Per-column `showInLookup: true` is removed — use `lookup.labels` instead
- `crouton migrate` can auto-move `showInLookup` columns to `lookup.labels`
- Use the crouton skill if available
