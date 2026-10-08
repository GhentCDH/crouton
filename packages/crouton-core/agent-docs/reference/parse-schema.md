# parseSchema (offline compilation)

Compile a single resource to the same JSON payload the `/schemas`, `/definition`, or `/resource.json` endpoint
returns — without booting a NestJS module and without touching the file system.

```ts
import { parseSchema } from '@ghentcdh/crouton-core';
```

## When to use it

| Use case | Solution |
|---|---|
| Pre-bake `schema.json` at build time | `parseSchema` + `JSON.stringify` |
| CLI / codegen tool that needs the compiled schema | `parseSchema` (no NestJS required) |
| Unit test that asserts schema shape | `parseSchema` (no server to boot) |
| Runtime schema serving in a NestJS app | Use `CroutonApiModule` — it calls the equivalent internally |

## API

```ts
parseSchema(
  input: ParseSchemaInput | unknown,
  appConfig: ParseAppConfig,
  view?: ParseSchemaView,     // default: 'schemas'
): Record<string, unknown> | undefined
```

### `ParseSchemaInput`

| Field          | Type                       | Description                                                                                    |
|----------------|----------------------------|------------------------------------------------------------------------------------------------|
| `json`         | `unknown`                  | Raw `resource.json` content (validated internally).                                            |
| `schema`       | `ZodObject<ZodRawShape>`   | Optional. Zod schema for the Prisma model. Provide for `kind: "prisma"`. Omit for `kind: "custom"`. |
| `enums`        | `EnumRegistry`             | Enum values to inject into columns that reference a named enum.                                |
| `hooks`        | `ResourceHooks`            | Lifecycle hooks (ignored by the schema payload, accepted for signature parity).                |
| `actions`      | `ResourceRowAction[]`      | Resolved row-level action procedures.                                                          |
| `tableActions` | `ResourceTableAction[]`    | Resolved table-level action procedures.                                                        |

You can also pass a bare raw `resource.json` object directly as `input` (without wrapping in `{ json: ... }`).

### `ParseAppConfig`

| Field            | Type                                | Description                                                            |
|------------------|-------------------------------------|------------------------------------------------------------------------|
| `baseUrl`        | `string`                            | Base URL used to build operation URIs in the payload.                  |
| `extensions`     | `Record<string, ZodType>`           | Custom extension sections to register before compilation.              |
| `schemaEnricher` | `(payload) => Record<string, unknown>` | Called after building the payload; its return is spread in.         |

### `ParseSchemaView`

| Value            | Equivalent endpoint         |
|------------------|-----------------------------|
| `'schemas'`      | `GET /<route>/schemas`      |
| `'definition'`   | `GET /<route>/definition`   |
| `'resource.json'`| `GET /<route>/resource.json`|

## Examples

### Prisma resource

```ts
import { parseSchema } from '@ghentcdh/crouton-core';
import { BookSchema } from './generated/types';
import resourceJson from './resources/book/resource.json';

const payload = parseSchema(
  { json: resourceJson, schema: BookSchema },
  { baseUrl: 'http://localhost:3000' },
  'schemas',
);
// JSON.stringify(payload) → same output as GET /books/schemas
```

### Custom resource

```ts
const payload = parseSchema(
  { json: resourceJson },
  { baseUrl: 'http://localhost:3000' },
);
```

## Limits

- **No sibling-file resolution.** Without `dirPath` (a file-system concept), `extend` columns, resource-ref column
  options, and sub-resource views are not populated. Use `CroutonApiModule` (or `fromJson` from `@ghentcdh/crouton-api`
  with a `dirPath`) when those features are required.
- **`view: 'schemas'` returns `undefined`** when the resource has no configured views (same as the live endpoint).
- **Custom resources** (`kind: "custom"`): omit `schema`; column-derived views are built from `fieldInput` types.

## `compileResource` (lower-level)

Lower-level function used internally by `parseSchema`. Takes a validated `ResourceJson` and returns a `CompiledResource`
(the in-memory representation before it is serialized to a payload).

```ts
import { compileResource } from '@ghentcdh/crouton-core';

const resource = compileResource(json, zodSchema, baseUrl, actions, tableActions, enums);
```

Use `parseSchema` unless you need the intermediate `CompiledResource` object.
