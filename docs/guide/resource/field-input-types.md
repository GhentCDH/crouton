# Field Input Types

Each column can declare a `fieldInput` block that controls how the field is rendered in forms, views, and tables. The `type` key selects the control; `options` holds per-type configuration.

```jsonc
"fieldInput": {
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/autocomplete.field-input.schema.json",
  "type": "autocomplete",
  "options": {
    "resource": "./author.resource",
    "labelKey": "name",
    "valueKey": "id"
  }
}
```

The `$schema` is stamped automatically by `crouton generate`. It points to a versioned JSON Schema file that your editor uses for autocomplete and validation of the `options` block.

## Available types

| `type`         | Renderer                        | Schema |
| -------------- | ------------------------------- | ------ |
| `string`       | Plain text input                | [string.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/string.field-input.schema.json) |
| `number`       | Number input                    | [number.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/number.field-input.schema.json) |
| `Integer`      | Integer input (alias for number)| [number.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/number.field-input.schema.json) |
| `textarea`     | Multi-line text                 | [textarea.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/textarea.field-input.schema.json) |
| `markdown`     | Markdown editor                 | [markdown.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/markdown.field-input.schema.json) |
| `boolean`      | Checkbox                        | [boolean.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/boolean.field-input.schema.json) |
| `toggle`       | Button-group single-select      | [toggle.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/toggle.field-input.schema.json) |
| `select`       | Dropdown select                 | [select.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/select.field-input.schema.json) |
| `mutliSelect`  | Multi-select dropdown           | [select.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/select.field-input.schema.json) |
| `autocomplete` | Autocomplete with remote/inline options | [autocomplete.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/autocomplete.field-input.schema.json) |
| `date`         | Date picker                     | [date.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/date.field-input.schema.json) |
| `dateTime`     | Date + time picker              | [date.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/date.field-input.schema.json) |
| `date-range`   | From/to date range picker       | [date-range.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/date-range.field-input.schema.json) |
| `relation`     | Sub-resource relation control   | [relation.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/relation.field-input.schema.json) |
| `array`        | Detail/array layout             | [array.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/array.field-input.schema.json) |
| `custom`       | App-registered custom renderer  | [custom.field-input.schema.json](https://ghentcdh.github.io/crouton/schema/v1/custom.field-input.schema.json) |

## Common options

All types accept these base options:

| Option        | Type    | Description |
| ------------- | ------- | ----------- |
| `label`       | string  | Override the field label |
| `hideLabel`   | boolean | Hide the label |
| `placeholder` | string  | Input placeholder text |
| `readonly`    | boolean | Render as read-only |
| `colspan`     | number  | Grid column span (1–12) |
| `width`       | string  | Named width: `xs` `sm` `md` `lg` `xl` `full`, or a CSS value |
| `customRender`| string  | Key of an app-registered Vue renderer component |

## Autocomplete

Three option shapes are supported:

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

## Custom controls

Register a custom renderer in your app:

```ts
import { registerFieldInputType } from '@ghentcdh/crouton-core';
import { z } from 'zod';

registerFieldInputType('color-picker', {
  options: z.object({ format: z.enum(['hex', 'rgb']).optional() }),
  schemaFile: 'color-picker',
});
```

Then use it in `resource.json`:

```jsonc
"fieldInput": {
  "type": "color-picker",
  "options": { "format": "hex" }
}
```

Unknown types fall back to the open `options` bag — no validation error.
