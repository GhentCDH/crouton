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

<!-- @include: ./_generated/autocomplete.md -->
