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
- Is hidden in table and form: `hiddenInTable: true`, `hiddenInForm: true`
- Has `relation.resource: "./book/resource.json"`, `relation.type: "oneToMany"`, `relation.foreignKey: "authorId"`
- Has `fieldInput.type: "relation"`
- Loads the relation via `operations.findOne.include: ["books"]` (detail only, not in list)

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Relation data model goes in `column.relation`, not in `fieldInput`
- `fieldInput.type: "relation"` renders an embedded table panel for oneToMany
- Include in `findOne` only — `books` is too heavy to load in the list
- `relation.foreignKey` is on the **target** resource (Book has `authorId`)
- Use the crouton skill if available
