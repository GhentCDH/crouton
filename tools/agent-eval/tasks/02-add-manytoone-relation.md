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
- Have `relation.resource: "./author/resource.json"`, `relation.type: "manyToOne"`, `relation.foreignKey: "authorId"`, `relation.displayKey: "name"`
- Have `fieldInput.type: "autocomplete"`
- Load the relation via `operations.findAll.include` and `operations.findOne.include`

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Relation data model goes in `column.relation`, not in `fieldInput.options`
- `fieldInput` only picks the UI widget (`type: "autocomplete"` for manyToOne)
- `include` belongs in `operations.findAll.include` / `operations.findOne.include`, not at root
- Use the crouton skill if available
