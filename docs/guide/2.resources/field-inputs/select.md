# Select / mutliSelect

Dropdown select. `mutliSelect` is an alias that enables multi-value selection.

Options can come from an inline array, a remote endpoint, or a resource reference — supply exactly one of `options`, `uri`, or `resource`.

```jsonc
"fieldInput": {
  "type": "select",
  "options": {
    "options": [{ "label": "Active", "value": "active" }],
    "labelKey": "label",
    "valueKey": "value",
    "storeValue": true,
    "clearable": true
  }
}
```

<!-- @include: ./_generated/select.md -->
