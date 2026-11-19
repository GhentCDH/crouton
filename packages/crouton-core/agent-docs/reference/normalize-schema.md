# normalize-schema.json

`normalize-schema.json` lets you rename ugly auto-generated relation field names in your Prisma schema after each
`prisma db pull`. Place it next to `schema.prisma` in the datasource's `prisma/<name>/` folder.

## Why

When Prisma introspects a database with ambiguous or composite foreign keys it generates deterministic but ugly field
names — `Work_author_idToAuthor`, `annotation_annotation_idToAnnotation`, etc. You can't control these via Prisma
config, and they leak into generated Zod types and your code. `normalize-schema.json` is a one-time rename map that
runs automatically as part of `crouton update resources` (between `prisma-case-format` and `prisma generate`), so
every pull keeps clean names without manual edits.

## File location

```
prisma/
└── <datasource-name>/
    ├── schema.prisma
    ├── prisma.config.ts
    └── normalize-schema.json   ← here
```

## Format

```json
{
  "renames": {
    "ModelName": {
      "uglyFieldName": "cleanFieldName"
    }
  }
}
```

- **`renames`** — map of Prisma model names to field rename maps.
- Each key inside a model is the *current* field name in the schema (after `prisma-case-format` has run); the value is
  the name you want, or `{ "to": "name", "relationOnly": true }` to rename only the relation field
  (see [Renaming only the relation field](#renaming-only-the-relation-field)).

## Example

Given a schema with:

```prisma
model Work {
  id                              Int      @id
  Work_author_idToAuthor          Author   @relation("Work_author_idToAuthor", fields: [author_id], references: [id])
  Work_reviewer_idToAuthor        Author   @relation("Work_reviewer_idToAuthor", fields: [reviewer_id], references: [id])
}
```

Add this alongside `schema.prisma`:

```json
{
  "renames": {
    "Work": {
      "Work_author_idToAuthor": "author",
      "Work_reviewer_idToAuthor": "reviewer"
    }
  }
}
```

After the next `crouton update resources` the schema becomes:

```prisma
model Work {
  id       Int    @id
  author   Author @relation("Work_author_idToAuthor", fields: [author_id], references: [id])
  reviewer Author @relation("Work_reviewer_idToAuthor", fields: [reviewer_id], references: [id])
}
```

The `@relation` name and `fields`/`references` are untouched — only the field name changes.

## Renaming only the relation field

A string rename matches **every** field line with that name in the model. When case-formatting gives a scalar and a
relation the same name (e.g. column `revision_status` and FK `revision_status_id → revision_status` both become
`revisionStatus`), use the object form with `relationOnly` to rename just the relation field:

```json
{
  "renames": {
    "Text": {
      "revisionStatus": { "to": "revisionStatusRel", "relationOnly": true }
    }
  }
}
```

```prisma
model Text {
  revisionStatus    String?
  revisionStatusId  Int?
  revisionStatusRel RevisionStatus? @relation(fields: [revisionStatusId], references: [id])
}
```

A field counts as a relation when its type is a model in the schema or the line contains `@relation(`. Scalar lines
are left alone. `{ "to": "..." }` without `relationOnly` behaves like the string form.

::: tip
You only need this to pick your own name. If you do nothing, `crouton update resources` resolves such collisions
automatically after `normalizeSchema` by renaming the relation field to `<name>Ref` (e.g. `revisionStatusRef`).
:::

## When it runs

`normalizeSchema` runs as step 4 of `crouton update resources`:

1. `prisma db pull` — introspect from the live database
2. `prisma-case-format` — PascalCase models, camelCase fields
3. **`normalizeSchema`** — apply renames from this file ← here
4. `prisma generate` — regenerate Zod types from the cleaned schema

It also runs inside the `crouton-prisma` generator itself (`prisma generate`), so the temp schema used for Zod
generation always has clean names even if you invoke `prisma generate` directly.

## Keeping it in sync

After a `prisma db pull` that adds new relation fields, re-check whether the generated names are ugly and add entries
to the file. Existing entries are applied on every pull, so you only need to add new ones — old ones are harmless even
if the field was already clean.

::: tip
Rename map keys must match the field name *as it appears after `prisma-case-format`* runs (camelCase), not the raw
introspected name (snake_case).
:::
