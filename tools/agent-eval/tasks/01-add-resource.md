# Task: Add a resource for an existing Prisma model

## Setup

You are working in a fresh crouton project. The Prisma schema already has a `Book` model:

```prisma
model Book {
  id            Int    @id @default(autoincrement())
  title         String
  isbn          String
  publishedYear Int
}
```

The `crouton.json` is configured with `resourcesDir: "src/resources"`.

## Your task

Create `src/resources/book/resource.json` for the `Book` model. The resource must:
- Have the correct `$schema` and `schemaVersion`
- Use `name: "book"` and `model: "Book"`
- Include columns for `id` (as `idField`, hidden in form), `title` (searchable, filterable, sortable), `isbn` (sortable), and `publishedYear` (type integer, sortable)

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- The `$schema` URL is `https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json`
- `schemaVersion` must be `1`
