# Task: Load a relation only on the detail view, not in the list

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists. The book resource currently has root-level `"include": ["author", "chapters"]` that loads both relations for both list and detail views.

## Your task

Migrate the `include` config so that:

1. `author` is included in **both** list and detail (needed for the table column)
2. `chapters` is included in **detail only** (too heavy for the list)
3. Root `include` is removed — it must live in `operations.findAll.include` and `operations.findOne.include`

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

Also verify with `crouton migrate --check` — must exit 0 (no stale keys).

## Hints

- `operations.findAll.include` = loaded for every list row
- `operations.findOne.include` = loaded only on the detail/edit view
- Root `include` is removed and causes a validation error
- `crouton migrate` can auto-move root include if needed
- Use the crouton skill if available
