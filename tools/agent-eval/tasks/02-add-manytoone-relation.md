# Task: Add a manyToOne relation from Book to Author

## Setup

You are working in a crouton project. Both `src/resources/book/resource.json` and `src/resources/author/resource.json` already exist. The Prisma schema has:

```prisma
model Book {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   Author @relation(fields: [authorId], references: [id])
}

model Author {
  id    Int    @id @default(autoincrement())
  name  String
  books Book[]
}
```

## Your task

Edit `src/resources/book/resource.json` to add a manyToOne relation for the `authorId` column. The column must:
- Have `label: "Author"`
- Use `fieldInput.type: "autocomplete"`
- Use `fieldInput.relationType: "manyToOne"`
- Reference the author resource with `fieldInput.resource: "./author.resource"`

Also add `"author"` to the `include` array on the book resource.

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- The `autocomplete` fieldInput type is for manyToOne relations (FK columns)
- The `include` array tells the API which relations to eager-load
