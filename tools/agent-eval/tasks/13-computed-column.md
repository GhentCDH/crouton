# Task: Add a computed column (SQL subquery)

## Setup

You are working in a crouton project. `src/resources/author/resource.json` exists. You want to show a `bookCount` column in the author list that counts how many books each author has.

The Prisma schema has:
```prisma
model Author {
  id    Int    @id @default(autoincrement())
  name  String
  books Book[]
}
model Book {
  id       Int @id @default(autoincrement())
  authorId Int
}
```

## Your task

Add a `bookCount` computed column to `src/resources/author/resource.json` that:
- Has `label: "Books"`
- Has `type: "number"`
- Uses a SQL subquery: `SELECT COUNT(*) FROM "Book" WHERE "Book"."authorId" = main.id`
- Is hidden in the form (computed columns are read-only)
- Shows in the table after the `name` column

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Computed columns go in `columns[id].computed.sql`, not in `calculatedColumns`
- Use `main` as the alias for the parent table row in the subquery
- Computed columns are implicitly `createable: false`, `updateable: false`, `hiddenInForm: true`
- Add the column to `layout.table.items` to control its position
- Use the crouton skill if available
