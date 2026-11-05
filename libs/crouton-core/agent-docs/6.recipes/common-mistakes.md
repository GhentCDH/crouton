---
description: The most common mistakes when working with crouton resources, and how to avoid them.
---

# Common mistakes

## 1. Hand-editing auto-generated columns

**Problem:** You edit `schema.ts` or accept every column in a `crouton update` diff without reviewing, then later run `crouton update` again and lose your changes.

**Rule:** `crouton update` fully regenerates `schema.ts`. Never edit it by hand.

**What you own:** Everything in `resource.json` — `fieldInput`, `label`, `searchable`, `sortable`, `hiddenInTable`, enum refs, relations. These are never overwritten.

**Fix:** Move any customisation into `resource.json`. If you find yourself wanting to change `schema.ts`, you probably want a column override in `resource.json` instead.

---

## 2. `kind: "custom"` when you only need an adapter

**Problem:** Your data comes from a non-Prisma backend (e.g. Elasticsearch). You set `kind: "custom"` on every resource and write a `repository.ts` for each one — which is a lot of boilerplate.

**Fix:** Set `adapter: "custom"` on the **datasource** in `data-source.json`. The adapter handles CRUD for all resources on that datasource. Resources stay `kind: "prisma"` (the default) and declare a `model`; the adapter uses the model name as the key.

Use `kind: "custom"` only when one resource has genuinely different data access than the others.

See [Decision tables — kind vs adapter](./decision-tables.md#kind-vs-adapter).

---

## 3. Wrong `fieldInput.type` spelling

**Problem:** A column with `fieldInput.type: "autocompleet"` or `"Textarea"` silently falls back to the default renderer. The form looks wrong but no error appears.

**Fix:** Run `crouton validate` — it checks `fieldInput.type` against the registered renderer list and reports unknown types.

```sh
npx crouton validate resources/book/resource.json
```

Valid built-in types: `autocomplete`, `textarea`, `select`, `multiSelect`, `boolean`, `toggle`, `date`, `date-range`, `number`, `markdown`, `array`, `string`.

---

## 4. Skipping `crouton validate` after editing `resource.json`

**Problem:** A typo in `resource.json` causes a silent load failure — the resource disappears from the sidebar with no obvious error message.

**Fix:** Always run `crouton validate` after any manual edit:

```sh
npx crouton validate resources/book/resource.json
```

For a whole directory:

```sh
npx crouton validate --all
```

Check the [status page](../3.backend/status.md) in the running app — it shows load errors for every resource.

---

## 5. Wrong relation direction

**Problem:** The `manyToOne` column (with the FK) is declared on the parent resource, or the `oneToMany` side is declared on the child. The autocomplete appears on the wrong form and saves nothing.

**Rule:** The `manyToOne` column goes on the model that **holds the foreign key**. The `oneToMany` side goes on the other end (the parent, in the UI sense).

**Example:** Book has `authorId` → book's `resource.json` gets the `manyToOne` autocomplete. Author has many books → author's `resource.json` gets the `oneToMany` embedded table.

**Fix:** Check which table has the FK column in the Prisma schema. That model's `resource.json` gets `manyToOne`; the other gets `oneToMany`.

See [Add relations](./add-relation.md) for a complete example.

---

## 6. Missing `$schema` in `resource.json`

**Problem:** Your editor does not autocomplete `resource.json` fields, and you do not discover typos until runtime.

**Fix:** Add the `$schema` line to every `resource.json`:

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  ...
}
```

VS Code and other editors with JSON Schema support will validate and autocomplete all fields inline.

---

## 7. Missing `model` for a Prisma resource

**Problem:** You copy a `kind: "custom"` example and forget to add `model`. Crouton rejects the resource at load time with a message about a missing model.

**Fix:** Every `kind: "prisma"` resource (the default) must declare `model` — the exact Prisma model name, case-sensitive.

```json
{
  "name": "book",
  "model": "Book",
  ...
}
```

---

## 8. Editing `resource.json` columns that match Prisma field names but not the right case

**Problem:** The Prisma model has `publishedYear` but you write `published_year` in `resource.json`. The column shows in the table but filtering and sorting break.

**Fix:** Column keys in `resource.json` must match the Prisma field name exactly (camelCase, as Prisma emits it). Run `crouton update` to generate the canonical names, then configure display on top.
