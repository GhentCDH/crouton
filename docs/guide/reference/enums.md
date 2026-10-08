# crouton.enums.json

`crouton.enums.json` is a project-level registry that maps Prisma enum names to their `{ value, label }` option lists.
Every resource that needs enum options references the registry by name instead of duplicating the list.

## File location

By default the file is named `crouton.enums.json` and placed at the project root (or workspace root for Nx). The
backend walks up from the resources directory until it finds the file. Override the path with `enumsFile` in
`crouton.json`.

```json
// crouton.json
{
  "enumsFile": "crouton.enums.json"
}
```

## Format

```json
{
  "EnumName": [
    { "value": "raw_db_value", "label": "Human label" },
    { "value": "another_value", "label": "Another label", "disabled": true }
  ]
}
```

- Keys are Prisma enum type names (e.g. `Status`, `AuthorOrigin`).
- Each entry is `{ value, label }`. `value` is what gets stored; `label` is shown in the UI.
- `disabled: true` hides an option from new selections while keeping it displayable for existing rows.

## Referencing an enum from a column

In `resource.json` set `enum` to the registry key:

```json
{
  "columns": {
    "status": {
      "label": "Status",
      "column": "status",
      "enum": "Status"
    }
  }
}
```

At load time `injectEnumValues` fills in `fieldInput.options.values`, `emitObject: true`, and `displayKey: "label"` —
you don't need to write these by hand. Override any of them explicitly in `fieldInput.options` and the injected
defaults won't overwrite your value.

## How it is generated and kept in sync

`crouton update resources` merges freshly introspected enums into the registry:

- **New** enums and members get a default label (`label_from_id`, e.g. `ACTIVE` → "Active").
- **Existing** members keep their labels and order — hand edits win.
- **Removed** members are never dropped automatically; remove them by hand when they're gone from the database.

Run it directly after a schema change:

```sh
npx crouton update resources
```

## Translated labels

When i18n is active, enum labels in read responses are overridden by `enums.<EnumName>.<value>` keys from the active
language bundle. The registry labels are the fallback when no translation is set. See
[Translations](../4.frontend/translations.md).

## Runtime loading

The backend loads the registry once at startup via `loadEnumRegistry`. It walks up from the resources directory
looking for `crouton.enums.json`, or uses the `enumsFile` path from `crouton.json` if set. A missing or invalid file
is treated as an empty registry — no error is thrown, enum columns just have no options.

Pass the registry explicitly via `forResourceDir`'s `enumsFile` option when the walk-up default would resolve to the
wrong path:

```ts
forResourceDir(resourcesDir, { enumsFile: '/absolute/path/to/crouton.enums.json' })
```
