# Common mistakes

## 1. Using removed root keys — run `crouton migrate`

Many root keys moved. If `crouton validate` says *"moved to … (run crouton migrate)"*, run the codemod:

```bash
crouton migrate --dry-run   # preview
crouton migrate             # apply
```

| Wrong (old) | Right (new) |
|---|---|
| `"model": "Book"` at root | `"source": { "model": "Book" }` |
| `"database": "main"` at root | `"source": { "datasource": "main" }` |
| `"table": "books"` at root | `"source": { "dbTable": "books" }` |
| `"idType": "number"` at root | `"source": { "idType": "number" }` |
| `"display": { "mode": "page" }` at root | `"layout": { "view": { "container": { "mode": "page" } } }` |
| `"modalSize": "lg"` at root | `"layout": { "form": { "container": { "size": "lg" } } }` |
| `"include": ["author"]` at root | `"operations": { "findAll": { "include": ["author"] }, "findOne": { "include": ["author"] } }` |
| `"calculatedColumns": [...]` | `"columns": { "myCol": { "computed": { "sql": "..." } } }` |
| `column.showInLookup: true` | `"lookup": { "labels": ["colId"] }` on resource root |

## 2. Putting relation config in fieldInput instead of column.relation

`fieldInput` only configures the UI widget. Relation data model belongs in `column.relation`.

```json
// WRONG
"authorId": {
  "fieldInput": {
    "type": "autocomplete",
    "relationType": "manyToOne",
    "resource": "./author/resource.json",
    "foreignKey": "authorId"
  }
}

// RIGHT
"authorId": {
  "relation": {
    "resource": "./author/resource.json",
    "type": "manyToOne",
    "foreignKey": "authorId",
    "displayKey": "name"
  },
  "fieldInput": { "type": "autocomplete" }
}
```

Run `crouton migrate` to auto-move relation keys.

## 3. Using `format: "relation"` to detect relations

`fieldInput.format` is removed. Use `isRelation(col)` from `@ghentcdh/crouton-core` or check `!!col.relation`.

## 4. Setting both `enum` and `fieldInput.options.values`

`enum` resolves a shared list from `crouton.enums.json` at load time. Setting both causes a validation error.
Use `enum` for shared lists, `fieldInput.options.values` for local inline lists — never both.

## 5. Hand-editing auto-generated columns

`crouton update` owns columns derived from Prisma. Edits to column names or types are overwritten on the next `crouton update`.
Only edit `fieldInput`, `label`, `hidden`, `required`, `relation` inside each column entry.

## 6. `kind: "custom"` when you need `adapter: "custom"`

`kind: "custom"` = this resource has a custom `repository.ts`.
If your data source is external (not Prisma), set `adapter: "custom"` in `datasource.json` instead.

## 7. Typos in fieldInput type

The `type` value is case-sensitive: `autocomplete` not `Autocomplete`; `select` not `Select`.
Run `crouton validate` — it reports unknown fieldInput types.

## 8. Missing `crouton validate` after edits

Schema violations, unknown resources in relations, and broken references are only caught by the validator.
Always run `crouton validate` after any change to `resource.json` or `crouton.json`.

## 9. Wrong relation direction

`manyToOne`: FK is on **this** resource. `oneToMany`: FK is on the **target** resource.
Swapping them causes the relation panel to query the wrong table.

## 10. `colspan`/`rowspan`/`hideLabel` on table items

These form-layout options have no effect on table items and are rejected with a validation error.
Remove them from `layout.table` items — use `width`, `align`, `truncate` for table-specific display.

## 11. Table/column settings on the wrapper instead of the table node

In a wrapper table layout, `rowActions`, `tableActions`, `searchFields`, `filterFields`, `pageSize` etc.
belong on the **`type: "table"` node**, not on the outer wrapper.
