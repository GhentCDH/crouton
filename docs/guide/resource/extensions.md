# Resource extensions

Resource extensions let another application add its own **top-level sections** to `resource.json` — for example an
`annotation` block or a `context` block — that crouton validates, carries through the pipeline, and re-emits on the
served schema payloads.

```json
{
  "id": "example",
  "name": "Example",
  "annotation": {
    "color": "#4fff66",
    "isRoot": false,
    "allowedChildren": ["lemma"],
    "allowedLinks": []
  },
  "columns": { "...": "..." }
}
```

Extensions are **validated** against a Zod schema you register at startup, and **normalized** into a single
`extensions` object on every payload:

```json
{
  "id": "example",
  "extensions": {
    "annotation": { "color": "#4fff66", "isRoot": false, "allowedChildren": ["lemma"], "allowedLinks": [] }
  }
}
```

::: tip Fully backward-compatible
No extension registered → behaviour is byte-identical to before. No `schemaVersion` bump required.
:::

## Register extensions

Pass an `extensions` map to `CroutonApiModule.forResourceDir`:

```ts
// app.module.ts
import { CroutonApiModule } from '@ghentcdh/crouton-api';
import { z } from 'zod';

const AnnotationSchema = z.object({
  color: z.string(),
  isRoot: z.boolean().default(false),
  allowedChildren: z.array(z.string()).default([]),
  allowedLinks: z.array(z.string()).default([]),
});

@Module({
  imports: [
    await CroutonApiModule.forResourceDir(
      resourcesDir,
      dataSourcesDir,
      {
        baseUrl: 'http://localhost:3000',
        extensions: {
          annotation: AnnotationSchema,
        },
      },
    ),
  ],
})
export class AppModule {}
```

::: warning Register before load
Extensions must be registered **before** any `resource.json` is parsed. `forResourceDir` does this automatically — it
registers first, then loads. If you use `forLoader` (with pre-loaded configs), register your extensions yourself before
loading the configs.
:::

## Author an extension in resource.json

Write the extension key at the top level, as a sibling of `columns`:

```json
{
  "$schema": "./resource.schema.json",
  "name": "lemma",
  "route": "lemmas",
  "tag": "Lemmas",
  "model": "Lemma",
  "annotation": {
    "color": "#4fff66",
    "isRoot": true,
    "allowedChildren": ["sense"],
    "allowedLinks": []
  },
  "operations": {},
  "columns": {}
}
```

- An extension key with a registered schema → validated; appears in `extensions` on all payloads.
- An unregistered top-level key → silently stripped (same as today).
- A registered key with the wrong type → parse error recorded in the resource load errors registry; the resource is
  still served, but the extension block is absent.
- A key that collides with a core key (`columns`, `name`, `route`, …) → `registerResourceExtension` throws at startup.

## Read extensions on the frontend

Extensions appear under `extensions` on the three crouton payloads:

| Endpoint | Field |
|----------|-------|
| `GET /<route>/schemas` | `extensions` |
| `GET /<route>/definition` | `extensions` |
| `GET /<route>/resource.json` | `extensions` |

```ts
const { data } = await fetch('/lemmas/schemas').then(r => r.json());
const annotation = data.extensions?.annotation;
// { color: '#4fff66', isRoot: true, allowedChildren: ['sense'], allowedLinks: [] }
```

## Editor autocomplete for extension keys

The committed `resource.schema.json` is generated at crouton-core build time when no extensions are registered, so it
does **not** know about `annotation` or `context`. An editor validating against it would flag extension keys as "not
allowed."

To give your authors autocomplete and inline validation for extension blocks, emit an app-specific
`resource.schema.json` after registering your extensions:

```ts
// scripts/gen-resource-schema.mjs  (run once after registering your extensions)
import { generateResourceJsonSchema, CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';
import { z } from 'zod';
import { writeFileSync } from 'node:fs';

// Register your extensions first
registerResourceExtensions({ annotation: AnnotationSchema });

const schema = generateResourceJsonSchema();
schema.$id = `https://your-app.example/schema/v${CURRENT_RESOURCE_VERSION}/resource.schema.json`;
writeFileSync('src/resources/resource.schema.json', JSON.stringify(schema, null, 2) + '\n');
```

Then point `$schema` at your generated file in each `resource.json`:

```json
{
  "$schema": "../../resource.schema.json"
}
```

## API reference

### `registerResourceExtension(name, schema)`

Register a single extension. Throws if `name` collides with a core resource key.

```ts
import { registerResourceExtension } from '@ghentcdh/crouton-core';
import { z } from 'zod';

registerResourceExtension('annotation', z.object({ color: z.string() }));
```

### `registerResourceExtensions(map)`

Register multiple extensions at once.

```ts
import { registerResourceExtensions } from '@ghentcdh/crouton-core';

registerResourceExtensions({ annotation: AnnotationSchema, context: ContextSchema });
```

### `getResourceExtensions()`

Returns the current registry as a read-only `Map<string, ZodType>`.

### `clearResourceExtensions()`

Clears the registry. Useful in tests — call in `afterEach` to prevent registered schemas leaking between test cases.

```ts
import { clearResourceExtensions } from '@ghentcdh/crouton-core';
import { afterEach } from 'vitest';

afterEach(() => clearResourceExtensions());
```

### `generateResourceJsonSchema()`

Returns a JSON Schema (draft-7) for the full resource.json shape including all registered extension keys. Use it to
emit an app-specific `resource.schema.json` for editor support.

## Scope

- **v1: resource-level only.** Per-column extension blocks (an `annotation` inside a column) are a documented follow-up.
- **Sub-resources**: `buildSubResourceViewsPayload` does not include `extensions` in v1.
- **Visual editor**: no visual editing of extension blocks in v1 — the editor round-trips them untouched.
