# Columns

`columns` accepts either form:

- **Map** — keyed by column id; the key becomes the column's `id`.
- **Array** — each entry needs an explicit `id`:

  ```json
  {
    "columns": [
      { "id": "id", "idField": true, "hiddenInForm": true },
      { "id": "title", "searchable": true, "sortable": true }
    ]
  }
  ```

Both forms support the same options:

| Option                                            | Description                                                                                                                                                                                                                                                                                                                 |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `idField`                                         | Marks the id column                                                                                                                                                                                                                                                                                                         |
| `type`                                            | Data type — a shorthand (`"string"`, `"integer"`, `"boolean"`, `"date"`, …) or a JSON Schema fragment for nested shapes. Optional on a prisma resource (derived from the Zod model); **required on every column of a `kind: "custom"` resource**, see [Custom resources](custom-resource.md#column-types)                   |
| `label` / `hideLabel`                             | Display label, or hide it                                                                                                                                                                                                                                                                                                   |
| `hiddenInTable` / `hiddenInForm` / `hiddenInView` | Visibility per context. On a `oneToMany` relation column, `hiddenInTable` also drops it from the `_count` subquery `findAll` issues — that count only ever fed a table cell                                                                                                                                                 |
| `sortable` / `defaultSort`                        | Sorting; `sortId` overrides the sort column                                                                                                                                                                                                                                                                                 |
| `searchable`                                      | Marks this column as a `?q=` search target. Multiple `searchable` columns produce an OR search. For `manyToOne` relation columns the search automatically resolves to the related resource's display field (e.g. `authorId` → `author.name`).                                                                               |
| `filterable`                                      | Gets a filter control                                                                                                                                                                                                                                                                                                       |
| `createable` / `updateable`                       | Whether the field is written on create/update                                                                                                                                                                                                                                                                               |
| `required`                                        | Whether the **form** demands a value. Overrides the Zod model in either direction on a prisma resource (`true` adds, `false` removes, omitted defers to the model); the only way to mark a field required on a `kind: "custom"` resource. Ignored on the id column and on fields that are neither createable nor updateable |
| `showWhen` / `hideWhen` / `disabledWhen`          | Conditional display: `{ "field": "...", "eq"/"neq"/"exists"/"notExists": ... }`                                                                                                                                                                                                                                                         |
| `displayKey`                                      | Nested field to display (e.g. `author.name`)                                                                                                                                                                                                                                                                                |
| `showInLookup`                                    | Sets the display label when **this** resource appears as an option in another resource's autocomplete. Does **not** affect `?q=` search — use `searchable: true` for that.                                                                                                                                                  |
| `unique`                                          | Validate the value is unique: `true`, or `{ scope, caseInsensitive, message }`. Checks as-you-type and maps a DB unique violation to this field. Needs a matching `@unique` constraint. See [Unique fields](unique.md)                                                                                                       |
| `column`                                          | Source column name when it differs from the key/`id` (defaults to `id`)                                                                                                                                                                                                                                                    |
| `enum`                                            | Name of a shared enum in `crouton.enums.json`; its `{ value, label }[]` is injected into `fieldInput.options.values`                                                                                                                                                                                                        |
| `extend`                                          | Path to another `resource.json` whose columns are expanded as virtual sub-columns under this key (with a per-sub-column `columns` override map)                                                                                                                                                                             |
| `fieldInput`                                      | Form control configuration, see below                                                                                                                                                                                                                                                                                       |
| `fieldView`                                       | Optional per-context override for the read-only view, see below                                                                                                                                                                                                                                                             |
| `fieldTable`                                      | Optional per-context override for the table cell, see below                                                                                                                                                                                                                                                                 |

## Free-text search (`?q=`)

Mark columns with `searchable: true` to include them in free-text search via `?q=` on the list endpoint.

```json
{
  "title": { "searchable": true },
  "authorId": {
    "searchable": true,
    "fieldInput": { "type": "autocomplete", "relationType": "manyToOne", "resource": "./author.resource" }
  }
}
```

- **Multiple `searchable` columns** are ORed together: `?q=tolkien` matches books whose `title` contains "tolkien" OR whose author name contains "tolkien".
- **`manyToOne` relation columns** (e.g. `authorId`) automatically resolve to the related resource's first visible display field (e.g. `author.name`), so you never search against a raw foreign key string.
- **`showInLookup`** is a separate concern — it controls the label shown when this resource appears as an autocomplete option somewhere else. Do not use `showInLookup` to drive `?q=` search; use `searchable` instead.

## Nested object and array columns

A column's `type` may be a full JSON Schema fragment, which is how you describe a value that is not a scalar:

```json
{
  "metadata": {
    "displayKey": "name",
    "type": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" }
      }
    }
  },
  "tags": {
    "type": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

An object column renders as a nested group of controls in the form, and — when it has a `displayKey` — as a single-value
record cell in the table.

## Field inputs (`fieldInput`)

`fieldInput` selects and configures the form control:

```json
{
  "column": "summary",
  "fieldInput": {
    "type": "textarea",
    "position": 2,
    "options": {
      "colspan": 4
    }
  }
}
```

See [Field input types](field-inputs/index.md) for the full list of types and their options.

### `defaultValue` — pre-filling the create form

Set `fieldInput.defaultValue` to pre-fill a field when the user opens a blank create form. The value is applied at
form-open time, not persisted until the user saves.

```json
{
  "status": {
    "fieldInput": {
      "type": "select",
      "defaultValue": "draft"
    }
  }
}
```

#### Dynamic default tokens

| Token      | Resolves to                                              |
|------------|----------------------------------------------------------|
| `"$now"`   | Current datetime as an ISO 8601 string                   |
| `"$today"` | Current date as an ISO 8601 date string (`"2025-03-14"`) |
| `"$user"`  | Current user object (requires `defaults` in `CroutonPlugin` config) |

**Using `$user`** requires passing the current user when setting up the plugin:

```ts
app.use(
  CroutonPlugin(api, {
    defaults: {
      '$user': { id: currentUser.id, name: currentUser.name },
    },
  }),
);
```

**Setting defaults at runtime** using `useCrouton().setDefault()`:

```ts
const crouton = useCrouton();

onMounted(async () => {
  const user = await fetchCurrentUser();
  crouton.setDefault('$user', user);
});
```

> Token resolution only affects the create form pre-fill. It has no effect on existing records loaded for
> editing, and it does not run server-side — use `beforeWrite` hooks for server-side defaults.

## Field variants — `fieldView` / `fieldTable`

By default a single `fieldInput` drives the form, the read-only view, and the table cell. A column may additionally
declare `fieldView` and/or `fieldTable` to render differently per context. Both are optional and have the same shape as
`fieldInput` (every key optional), so a variant overrides only what it needs.

The config that drives each context is resolved through a fallback chain:

- **form** (and filter) ← `fieldInput`
- **view** ← `fieldView`, falling back to `fieldInput`
- **table** ← `fieldTable`, falling back to `fieldView`, then `fieldInput`

Resolution is a **deep merge, one level into `options`**: a variant layers over the level below it. A value of `null`
in a variant deletes that inherited key.

```json
{
  "column": "author",
  "label": "Author",
  "displayKey": "name",
  "fieldInput": {
    "format": "relation",
    "resource": "./author/resource.json",
    "options": {
      "display": "autocomplete",
      "displayKey": "name"
    }
  },
  "fieldView": {
    "options": { "display": "link" }
  },
  "fieldTable": {
    "options": { "displayKey": "shortName" }
  }
}
```

Here the edit form renders an autocomplete, the read-only view renders a link (inheriting `displayKey: "name"` from
`fieldInput`), and the table cell renders a link keyed by `shortName`.

`position` may also be overridden per variant, giving free per-context ordering.

### Custom table cell renderer

Add `customComponent` to `fieldTable.options` to override the table cell with a custom Vue component:

```json
{
  "column": "section_number",
  "fieldInput": { "type": "number", "position": 0 },
  "fieldTable": {
    "options": { "customComponent": "moveUpDown" }
  }
}
```

The custom cell component receives `data` (full row object), `value` (cell value), `column`, and `options` as props.
See [Custom renderers](../4.frontend/custom-renderers.md) for how to register the component.

## Calculated columns

Read-only columns computed in SQL at query time. Use `main` as the alias for the resource's own table:

```json
{
  "calculatedColumns": [
    {
      "id": "chapter_count",
      "alias": "chapter_count",
      "label": "Chapters",
      "type": "number",
      "position": 5,
      "sqlExpression": "(SELECT count(*) FROM chapter c WHERE c.book_id = main.id)"
    }
  ]
}
```

| Field           | Type     | Description                                               |
|-----------------|----------|-----------------------------------------------------------|
| `id`            | `string` | Column id                                                 |
| `alias`         | `string` | SQL alias — must match `id` in most cases                 |
| `label`         | `string` | Display label                                             |
| `type`          | `string` | Data type shorthand (`"number"`, `"string"`, etc.)         |
| `position`      | `number` | Order among columns                                       |
| `hiddenInTable` | `boolean`| Hide from table (still available via API)                 |
| `sqlExpression` | `string` | The SQL subquery expression. Use `main` for the parent table alias. |

::: warning
Calculated columns are not available on `kind: "custom"` resources — they run raw SQL against a real table.
Compute the value in `findAll` instead.
:::

## Includes

Eagerly load relations with the list/detail queries:

```json
{
  "include": [
    "author",
    {
      "relation": "chapters",
      "orderBy": { "position": "asc" },
      "include": ["sections"]
    }
  ]
}
```

| Field      | Type             | Description                                                        |
|------------|------------------|--------------------------------------------------------------------|
| `relation` | `string`         | Prisma relation field name                                         |
| `orderBy`  | `object`         | Optional sort: `{ field: 'asc' \| 'desc' }` for included records  |
| `include`  | `array`          | Nested includes                                                    |

When a relation column has a `sort` option (see [Relations](relations.md#sorting-related-records)), the loader
automatically injects the corresponding `orderBy` into the include clause — no manual configuration needed.
