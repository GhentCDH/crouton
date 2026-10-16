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
| `hiddenInTable` / `hiddenInForm` / `hiddenInView` | Visibility per context when **no layout is defined for that context**. When `layout.<ctx>` exists it is the full list — only listed columns are rendered, and these flags are ignored. On a `oneToMany` relation column, `hiddenInTable` also drops it from the `_count` subquery `findAll` issues — that count only ever fed a table cell |
| `createable` / `updateable`                       | Whether the field is written on create/update                                                                                                                                                                                                                                                                               |
| `required`                                        | Whether the **form** demands a value. Overrides the Zod model in either direction on a prisma resource (`true` adds, `false` removes, omitted defers to the model); the only way to mark a field required on a `kind: "custom"` resource. Ignored on the id column and on fields that are neither createable nor updateable |
| `displayKey`                                      | Nested field to display (e.g. `author.name`)                                                                                                                                                                                                                                                                                |
| `showInLookup`                                    | Sets the display label when **this** resource appears as an option in another resource's autocomplete. Does **not** affect `?q=` search — use `layout.table.searchFields` for that.                                                                                                                                         |
| `unique`                                          | Validate the value is unique: `true`, or `{ scope, caseInsensitive, message }`. Checks as-you-type and maps a DB unique violation to this field. Needs a matching `@unique` constraint. See [Unique fields](unique.md)                                                                                                       |
| `column`                                          | Source column name when it differs from the key/`id` (defaults to `id`)                                                                                                                                                                                                                                                    |
| `enum`                                            | Name of a shared enum in `crouton.enums.json`; its `{ value, label }[]` is injected into `fieldInput.options.values`                                                                                                                                                                                                        |
| `extend`                                          | Path to another `resource.json` whose columns are expanded as virtual sub-columns under this key (with a per-sub-column `columns` override map)                                                                                                                                                                             |
| `fieldInput`                                      | Form control configuration, see below                                                                                                                                                                                                                                                                                       |

::: warning Moved to `layout.table`
The following column-level options are **deprecated** and will be removed. Use `layout.table` instead:

- `sortable` / `defaultSort` → `layout.table.items[{ id, sortable, defaultSort }]`
- `searchable` → `operations.findAll.search: ["colId"]`
- `filterable` → `layout.table.filterFields: ["colId"]`
- `showWhen` / `hideWhen` / `disabledWhen` → `layout.table.items[{ id, showWhen, ... }]`
- `fieldTable` → `layout.table.items[{ id, type, options }]`

See [Layout — Table layout](layout.md#table-layout-layouttable) and [migrate-to-next-alpha.md](/migrate-to-next-alpha) for migration details.
:::

## Free-text search (`?q=`)

Declare which columns are included in free-text search via `operations.findAll.search`:

```json
{
  "operations": {
    "findAll": {
      "search": ["title", "authorId"]
    }
  }
}
```

- **Multiple entries** are ORed together: `?q=tolkien` matches books whose `title` contains "tolkien" OR whose author name contains "tolkien".
- **`manyToOne` relation columns** (e.g. `authorId`) automatically resolve to the related resource's first visible display field (e.g. `author.name`), so you never search against a raw foreign key string.
- **`showInLookup`** is a separate concern — it controls the label shown when this resource appears as an autocomplete option somewhere else. Do not use it to drive `?q=` search; use `operations.findAll.search` instead.
- **Default**: when `findAll: true` and no explicit `search` is declared, all simple (non-id, non-relation, non-date) columns are searched.

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

## Field variants — per-context overrides

A single `fieldInput` drives the form, the read-only view, and the table cell. To render differently in a specific context, use layout item overrides:

- **form** ← `fieldInput`
- **view** ← `fieldInput` (override per-column via `layout.view.items[{ id, type, options }]`)
- **table** ← `type`/`options` on the `layout.table.items[]` entry, falling back to `fieldInput`

```json
{
  "columns": {
    "author": {
      "label": "Author",
      "displayKey": "name",
      "fieldInput": {
        "format": "relation",
        "resource": "./author/resource.json",
        "options": { "display": "autocomplete", "displayKey": "name" }
      }
    }
  },
  "layout": {
    "view": {
      "items": [
        { "id": "author", "options": { "display": "link" } }
      ]
    },
    "table": {
      "items": [
        { "id": "author", "options": { "displayKey": "shortName" } }
      ]
    }
  }
}
```

The edit form renders an autocomplete, the read-only view renders a link, and the table cell uses `shortName`.

### Custom table cell renderer

Add `customComponent` to the table layout item's `options` to override the cell with a custom Vue component:

```json
{
  "layout": {
    "table": {
      "items": [
        { "id": "section_number", "options": { "customComponent": "moveUpDown" } }
      ]
    }
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
