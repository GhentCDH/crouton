# Field inputs — column type → input type

| Column type (Prisma) | Recommended fieldInput type | Notes |
|---------------------|-----------------------------|-------|
| `String` | `string` | Default for text |
| `String` (long text) | `textarea` | Use when content is multi-line prose |
| `String` (rich text) | `markdown` | Renders a Markdown editor |
| `Int` / `Float` / `Decimal` | `number` | |
| `Boolean` | `toggle` | Renders a toggle switch |
| `DateTime` | `date` | Date picker; use `date-range` for range filters |
| `String[]` / `Int[]` | `array` | Multi-value field |
| Enum | `select` | Pass `options` from the enum values |
| FK column (relation) | `autocomplete` | Requires `resource` + `labelField` |
| PK / internal | `hidden` | Suppresses the field from forms |
| Computed / read-only | `string` + `readonly: true` | Shows value, disallows editing |

## autocomplete options

```json
{
  "type": "autocomplete",
  "resource": "author",
  "labelField": "name"
}
```

`resource` — the target resource name (folder name under `resourcesDir`).
`labelField` — the column from the target resource to show as the label.

## select options

```json
{
  "type": "select",
  "options": [
    { "value": "draft", "label": "Draft" },
    { "value": "published", "label": "Published" }
  ]
}
```

Options can also be sourced from `crouton.enums.json` via `enumKey`.

## custom field input

Register a custom Vue component, then reference it:

```json
{ "type": "custom", "component": "MyCustomInput" }
```

The component must be registered globally or via `useCrouton` before the form mounts.
