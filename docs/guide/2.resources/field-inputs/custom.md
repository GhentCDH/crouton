# Custom

App-registered custom renderer component. Register the component in your app setup:

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

<!-- @include: ./_generated/custom.md -->
