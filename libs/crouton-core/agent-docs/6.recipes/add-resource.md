---
description: Add a resource for an existing Prisma model — generate a stub, set required fields, and validate.
---

# Add a resource for an existing Prisma model

**Files to touch:** `resources/<name>/resource.json`

## Steps

### 1. Generate a stub

Run `crouton update` to introspect the Prisma schema and generate stubs for any models that do not yet have a resource:

```sh
npx crouton update resources
```

The CLI prompts you to confirm each new resource and skips existing ones. Accept the ones you want. The result is a directory like:

```
resources/book/
├── resource.json   ← generated stub
└── schema.ts       ← generated Zod model (do not edit by hand)
```

Alternatively, create the files manually with `crouton create-resource`:

```sh
npx crouton create-resource book --title "Books"
```

### 2. Set required fields

Open `resource.json` and verify:

- `name` matches the folder name (e.g. `"book"` in `resources/book/`)
- `model` is the exact Prisma model name (case-sensitive, e.g. `"Book"`)
- `title` is the human-readable label for the sidebar and page heading

### 3. Validate

```sh
npx crouton validate resources/book/resource.json
```

Fix any reported issues, then run the command again until it passes.

### 4. Add to the sidebar

By default the resource appears in the sidebar alphabetically. To set an explicit position or group:

```json
"sidebar": { "label": "Books", "group": "catalogue", "position": 1 }
```

Groups are defined in `crouton.json` under `sidebarGroups`.

## Complete example

The book resource from the book-collection example — a Prisma model with searchable/sortable columns, an enum status field, an autocomplete relation, and a manyToMany relation:

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "model": "Book",
  "title": "Books",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "searchable": true, "filterable": true, "sortable": true },
    "isbn": { "sortable": true },
    "publishedYear": { "type": "integer", "sortable": true },
    "status": { "enum": "bookStatus", "filterable": true },
    "summary": { "fieldInput": { "type": "textarea" }, "hiddenInTable": true },
    "authorId": {
      "label": "Author",
      "searchable": true,
      "fieldInput": {
        "type": "autocomplete",
        "relationType": "manyToOne",
        "resource": "./author.resource"
      }
    },
    "categories": {
      "label": "Categories",
      "fieldInput": {
        "format": "relation",
        "relationType": "manyToMany",
        "resource": "./category.resource"
      },
      "hiddenInTable": true
    }
  },
  "include": ["author", "categories"]
}
```

## What `crouton update` owns vs what you own

`crouton update` regenerates `schema.ts` and may add new columns it detects in the Prisma schema. It will **not** overwrite field-level config you have set (`searchable`, `fieldInput`, `label`, etc.) — but it will add columns you have not seen yet. Review the diff each time before accepting.

See [Decision tables](./decision-tables.md#crouton-update-vs-hand-edits) for the full breakdown.
