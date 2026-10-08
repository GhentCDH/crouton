# Task: Add an enum select field to Book resource

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists. The Prisma schema has:

```prisma
enum BookStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Book {
  id     Int        @id @default(autoincrement())
  title  String
  status BookStatus @default(DRAFT)
}
```

The `crouton.enums.json` already has:

```json
{
  "bookStatus": [
    { "value": "DRAFT", "label": "Draft" },
    { "value": "PUBLISHED", "label": "Published" },
    { "value": "ARCHIVED", "label": "Archived" }
  ]
}
```

## Your task

Edit `src/resources/book/resource.json` to add a `status` column that:
- References the enum with `enum: "bookStatus"`
- Is filterable

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- Enum columns use the `enum` property (not `fieldInput.type: "select"`) to reference the enum key from `crouton.enums.json`
