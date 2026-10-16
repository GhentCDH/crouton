# Task: Table column options — width, align, defaultSort desc, pageSize

## Setup

You have an existing book resource at `src/resources/book/resource.json` with `schemaVersion: 2`:

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v2/resource.schema.json",
  "schemaVersion": 2,
  "name": "book",
  "model": "Book",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "searchable": true },
    "publishedYear": { "type": "number" },
    "isbn": {},
    "status": {}
  }
}
```

## Your task

Add a `layout.table` that:

1. Shows columns in order: `title`, `publishedYear`, `isbn`, `status`
2. `title` — width `md`, truncated to one line
3. `publishedYear` — width `xs`, right-aligned, sorted **descending** by default
4. `isbn` — hidden initially (`visible: false`)
5. `status` — pinned to the left
6. Page size 50, selector options `[20, 50, 100]`
7. Row click opens the view

## Verification

Run: `node tools/agent-eval/verify/verify-10-table-column-options.mjs --cwd <project-dir>`

## Hints

- `defaultSort: "desc"` sorts descending; `defaultSort: true` sorts ascending
- `visible: false` hides the column (column chooser coming later)
- `pin: "left"` makes a column sticky on the left
- `pageSize` and `pageSizes` go on the table node, not on items
- `rowClick: "view"` opens the view when a row is clicked
