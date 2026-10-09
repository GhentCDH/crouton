# Task: Add a oneToMany relation on Author to show Books

## Setup

You are working in a crouton project. Both `src/resources/book/resource.json` and `src/resources/author/resource.json` exist. The Prisma schema has:

```prisma
model Author {
  id    Int    @id @default(autoincrement())
  name  String
  books Book[]
}

model Book {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   Author @relation(fields: [authorId], references: [id])
}
```

## Your task

Edit `src/resources/author/resource.json` to add a `books` column that:
- Has `label: "Books"`
- Is hidden in the table (`hiddenInTable: true`) and hidden in the form (`hiddenInForm: true`)
- Uses `fieldInput.format: "relation"`
- Uses `fieldInput.relationType: "oneToMany"`
- References the book resource with `fieldInput.resource: "./book.resource"`

Also add `"books"` to the `include` array on the author resource.

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- The `format: "relation"` (not `type`) is used for oneToMany and manyToMany relations
- `include` must contain the relation name (Prisma relation field name)
