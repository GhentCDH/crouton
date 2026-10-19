# Recipes — common tasks

## Add a resource for an existing Prisma model

1. Confirm the model exists in `schema.prisma`.
2. Run `crouton update` and select the model when prompted.
3. Crouton writes `<resourcesDir>/<name>/resource.json`.
4. Edit `resource.json`: set labels, choose fieldInput types, add relations.
5. Run `crouton validate`.

Minimal resource:

```json
{
  "schemaVersion": 1,
  "name": "book",
  "title": "Books",
  "source": { "model": "Book" },
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "label": "Title" }
  }
}
```

## Add a manyToOne relation (autocomplete)

In `resource.json` of the resource holding the FK:

```json
{
  "columns": {
    "authorId": {
      "label": "Author",
      "relation": {
        "resource": "./author/resource.json",
        "type": "manyToOne",
        "foreignKey": "authorId",
        "displayKey": "name"
      },
      "fieldInput": { "type": "autocomplete" }
    }
  },
  "operations": {
    "findAll": { "include": ["author"] },
    "findOne": { "include": ["author"] }
  }
}
```

## Add a oneToMany relation (embedded panel)

In `resource.json` of the parent resource:

```json
{
  "columns": {
    "reviews": {
      "label": "Reviews",
      "hiddenInTable": true,
      "hiddenInForm": true,
      "relation": {
        "resource": "./review/resource.json",
        "type": "oneToMany",
        "foreignKey": "bookId",
        "sort": "createdAt",
        "sortDir": "desc"
      },
      "fieldInput": { "type": "relation" }
    }
  },
  "operations": {
    "findOne": { "include": ["reviews"] }
  }
}
```

## Add an enum select

1. Add the enum to `crouton.enums.json` (or let `crouton update` create it).
2. In `resource.json` use `enum` to reference it:

```json
{
  "columns": {
    "status": {
      "enum": "BookStatus",
      "fieldInput": { "type": "select" }
    }
  }
}
```

Or use inline `values` for a local list (not shared):

```json
{
  "columns": {
    "genre": {
      "fieldInput": {
        "type": "select",
        "options": { "values": [
          { "value": "fiction", "label": "Fiction" },
          { "value": "non-fiction", "label": "Non-fiction" }
        ]}
      }
    }
  }
}
```

Never set both `enum` and `fieldInput.options.values` — validation error.

## Right-align numbers, newest-first, 50 per page

```json
{
  "layout": {
    "table": {
      "pageSize": 50,
      "pageSizes": [20, 50, 100],
      "items": [
        { "id": "title", "sortable": true },
        { "id": "price", "align": "right", "width": "xs", "sortable": true },
        { "id": "createdAt", "sortable": true, "defaultSort": "desc" }
      ]
    }
  }
}
```

`defaultSort: "desc"` sets newest-first as the initial sort direction.

## Truncate long text in table

```json
{ "id": "description", "truncate": 3 }
```

`truncate: 3` = max 3 lines before clamp. `truncate: true` = single-line ellipsis.

## Pin a column sticky left

```json
{ "id": "name", "pin": "left", "width": "md" }
```

## Open view as page, form as large modal

```json
{
  "layout": {
    "form": { "container": { "mode": "modal", "size": "xl" } },
    "view": { "container": { "mode": "page" } }
  }
}
```

## Load a relation only on detail, not in list

```json
{
  "operations": {
    "findAll": { "include": [] },
    "findOne": { "include": ["author", "chapters"] }
  }
}
```

## Add a computed column (SQL subquery)

```json
{
  "columns": {
    "chapterCount": {
      "label": "Chapters",
      "type": "number",
      "computed": {
        "sql": "SELECT COUNT(*) FROM chapter WHERE chapter.book_id = main.id"
      }
    }
  }
}
```

Use `main` as the alias for the parent table row.

## Set dropdown labels for this resource

Control how this resource's records appear in other resources' autocompletes:

```json
{
  "lookup": {
    "labels": ["title", "authorId"],
    "separator": " · "
  }
}
```

Replaces `showInLookup: true` on individual columns.

## Custom field input + renderer registration

1. Create a Vue component `MyInput.vue`.
2. Register it via `useCrouton`:
   ```ts
   crouton.registerRenderer('MyInput', MyInput);
   ```
3. Reference in `resource.json`:
   ```json
   { "fieldInput": { "type": "custom", "component": "MyInput" } }
   ```

## Config-only resource (kind: custom)

Use when the resource has no Prisma model or uses fully custom data logic.

1. Create `<resourcesDir>/<name>/resource.json` with `"kind": "custom"`.
2. Create `<resourcesDir>/<name>/repository.ts` implementing the crouton repository interface.
3. Register the repository in the NestJS module.
4. Run `crouton validate`.
