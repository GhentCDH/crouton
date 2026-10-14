# Task: Add a component above the table, make `isbn` sortable, give the table a heading

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
    "isbn": {},
    "publishedYear": {}
  },
  "layout": {
    "table": {
      "type": "grid",
      "columns": 12,
      "items": [
        {
          "type": "table",
          "items": ["title", "isbn", "publishedYear"]
        }
      ]
    }
  }
}
```

## Your task

Modify `layout.table` so that:

1. A custom component `CreateByIsbn` (colspan 12) appears **above** the table
2. The `isbn` column is **sortable**
3. The table has the heading **"Books"**

## Verification

Run: `node tools/agent-eval/verify/verify-09-layout-items-heading.mjs --cwd <project-dir>`

## Hints

- Use the crouton skill if available
- Table settings (`sortable`, `rowActions`, `tableActions`, heading) go on the `type: "table"` node, not a wrapper
- A component item uses `{ "component": "ComponentName", "colspan": 12 }`
- Do NOT use `controls` (removed) or `actions` (renamed to `rowActions`)
