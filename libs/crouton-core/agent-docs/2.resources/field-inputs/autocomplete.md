# Autocomplete

Autocomplete with optional free-text and create. Three option shapes are supported — supply exactly one of `options`, `uri`, or `resource`.

**Inline options array:**
```jsonc
"fieldInput": {
  "type": "autocomplete",
  "options": {
    "options": [{ "label": "Active", "value": "active" }],
    "labelKey": "label",
    "valueKey": "value"
  }
}
```

**Remote endpoint:**
```jsonc
"fieldInput": {
  "type": "autocomplete",
  "options": {
    "uri": "/api/authors",
    "dataField": "data",
    "labelKey": "name",
    "valueKey": "id"
  }
}
```

**Resource reference:**
```jsonc
"fieldInput": {
  "type": "autocomplete",
  "options": {
    "resource": "./author.resource",
    "labelKey": "name",
    "valueKey": "id"
  }
}
```

## Excluding already-selected values

Use `exclude` to hide values the user already chose — useful for many-to-many chip lists or sibling field constraints.

```jsonc
"fieldInput": {
  "type": "autocomplete",
  "options": {
    "resource": "./author.resource",
    "labelKey": "name",
    "valueKey": "id",
    "exclude": {
      "values": "{form.coAuthors}",   // {form.path} placeholder or a literal array
      "key": "id",                     // filter field — defaults to valueKey
      "selected": true                 // also exclude this field's own current value
    }
  }
}
```

- **`values`** — a `{form.path}` placeholder (resolved at fetch time) or a literal `unknown[]`. Objects in the array are mapped through `valueKey` to extract the scalar.
- **`key`** — the server-side field used for the `not_in` filter. Defaults to `valueKey` (or `"id"`).
- **`selected`** — when `true`, the control's own current value is also excluded. Automatically applied by `RelationInline` for many-to-many chips.

For resource-backed autocomplete the exclude list is sent as a `filter=<key>:[…]:not_in` query param (skipped above 200 values). For remote URIs, add `{exclude}` to the URI template. Client-side filtering always runs as a fallback.

<!-- @include: ./_generated/autocomplete.md -->
