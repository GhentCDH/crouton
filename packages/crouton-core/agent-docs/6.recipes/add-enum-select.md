---
description: Add an enum select field — define the enum, register it in crouton.enums.json, and wire it to a column.
---

# Add an enum select field

Use an enum select when a column stores one of a fixed set of values (e.g. `draft`, `published`, `archived`).

## Steps

### 1. Define the enum in your Prisma schema

```prisma
enum BookStatus {
  draft
  published
  archived
}

model Book {
  id     Int        @id @default(autoincrement())
  status BookStatus @default(draft)
}
```

### 2. Register the enum in `crouton.enums.json`

The enum registry maps a key to an array of `{ value, label }` entries. The key is what you reference from `resource.json`:

```json
{
  "bookStatus": [
    { "value": "draft",     "label": "Draft" },
    { "value": "published", "label": "Published" },
    { "value": "archived",  "label": "Archived" }
  ]
}
```

The path to this file is set by `enumsFile` in `crouton.json` (default: `crouton.enums.json` at the project root).

### 3. Run `crouton update` to sync the schema

```sh
npx crouton update resources
```

This regenerates `schema.ts` to include the Prisma enum type. You only need to do this after changing the Prisma schema.

### 4. Reference the enum from the column

Use the `enum` key to point at the registry entry. Crouton automatically renders a select input for enum columns:

```json
"status": {
  "enum": "bookStatus",
  "filterable": true
}
```

The column renders as a dropdown in the form and as a labelled chip in the table. To use a different display, set `fieldInput.type` explicitly (see below).

### 5. Validate

```sh
npx crouton validate resources/book/resource.json
```

### Complete example

Full `resource.json` for a book resource with an enum status column:

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "model": "Book",
  "title": "Books",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "searchable": true, "sortable": true },
    "status": {
      "enum": "bookStatus",
      "filterable": true
    }
  }
}
```

## Inline options (no enum registry)

When the values are resource-specific and not shared, define them inline with `fieldInput.type: "select"`:

```json
"priority": {
  "fieldInput": {
    "type": "select",
    "options": {
      "options": [
        { "value": "low",    "label": "Low" },
        { "value": "medium", "label": "Medium" },
        { "value": "high",   "label": "High" }
      ],
      "storeValue": true
    }
  }
}
```

`storeValue: true` stores the raw `value` string in the database column. Without it the whole `{ value, label }` object is stored.

See [Select field input](../2.resources/field-inputs/select.md) for all options.
