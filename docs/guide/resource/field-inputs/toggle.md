# Toggle

Button-group single-select. Use `options` (or the deprecated `values` alias) to supply the choices.

```jsonc
"fieldInput": {
  "type": "toggle",
  "options": {
    "options": [
      { "label": "Yes", "value": true },
      { "label": "No",  "value": false }
    ],
    "labelKey": "label",
    "valueKey": "value",
    "storeValue": true
  }
}
```

<!-- @include: ./_generated/toggle.md -->
