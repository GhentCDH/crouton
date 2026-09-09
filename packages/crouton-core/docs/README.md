# Crouton Core

`@ghentcdh/crouton-core` contains the shared, framework-agnostic foundation of crouton: schema creation, builders, filter and request/response models, and offline schema compilation. It is published as `@ghentcdh/crouton-api` and `@ghentcdh/crouton-vue` both depend on it.

## What lives here

- **Schema creation** (`create-schema`, `schema.utils`, `zod.types`) — turn a `resource.json` definition into Zod schemas for validation and JSON schemas for the UI.
- **`fromJson` builder** — parse and normalize a raw `resource.json` file.
- **Offline schema compilation** (`compile/`) — compile a single resource to its schema payload without a NestJS module or file system access. See [`parseSchema`](#parseschema) below.
- **Layout builders** (`layout/`) — programmatically build JSON Forms UI layouts: controls, groups, categories.
- **Table builders** (`table/`) — column definitions and utilities for data tables.
- **Filter model** (`filter`) — filter definitions shared between API querying and UI filter components.
- **Request / response models** — pagination, sorting, and list-response contracts shared by both sides.
- **Relation types** — typing for relations between resources.

## `parseSchema`

Compile a single resource to the same JSON payload the `/schemas`, `/definition`, or `/resource.json` endpoint returns — without booting a NestJS module and without touching the file system.

```ts
import { parseSchema } from '@ghentcdh/crouton-core';

// prisma resource — pass the Zod schema for full field narrowing
const payload = parseSchema(
  { json: rawResourceJson, schema: myZodSchema },
  { baseUrl: 'http://localhost:3000' },
  'schemas', // 'schemas' | 'definition' | 'resource.json'
);

// custom resource — schema is not needed
const customPayload = parseSchema(
  { json: rawResourceJson },
  { baseUrl: 'http://localhost:3000' },
);
```

### When to use it

| Use case | Solution |
|---|---|
| Pre-bake `schema.json` at build time | `parseSchema` + `JSON.stringify` |
| CLI / codegen tool that needs the compiled schema | `parseSchema` (no NestJS required) |
| Unit test that asserts schema shape | `parseSchema` (no server to boot) |
| Runtime schema serving in a NestJS app | Use `CroutonApiModule` — it calls the equivalent internally |

### API

```ts
parseSchema(
  input: ParseSchemaInput | unknown,
  appConfig: ParseAppConfig,
  view?: ParseSchemaView,     // default: 'schemas'
): Record<string, unknown> | undefined
```

**`ParseSchemaInput`**

| Field | Type | Description |
|---|---|---|
| `json` | `unknown` | Raw `resource.json` content (validated internally). |
| `schema` | `ZodObject<ZodRawShape>` | Optional. Zod schema for the Prisma model. Provide it for `kind: "prisma"` to get per-operation field narrowing and typed validation schemas. Omit for `kind: "custom"` (views are derived from column `fieldInput` types instead). |
| `enums` | `EnumRegistry` | Enum values to inject into columns that reference a named enum. |
| `hooks` | `ResourceHooks` | Lifecycle hooks (ignored by the schema payload, accepted for signature parity). |
| `actions` | `ResourceRowAction[]` | Resolved row-level action procedures. |
| `tableActions` | `ResourceTableAction[]` | Resolved table-level action procedures. |

You can also pass a bare raw `resource.json` object directly as `input` (without wrapping in `{ json: ... }`).

**`ParseAppConfig`**

| Field | Type | Description |
|---|---|---|
| `baseUrl` | `string` | Base URL used to build operation URIs in the payload. |
| `extensions` | `Record<string, ZodType>` | Custom extension sections to register before compilation. |
| `schemaEnricher` | `(payload) => Record<string, unknown>` | Called after building the payload; its return is spread in. |

**`ParseSchemaView`**

| Value | Equivalent endpoint |
|---|---|
| `'schemas'` | `GET /<route>/schemas` |
| `'definition'` | `GET /<route>/definition` |
| `'resource.json'` | `GET /<route>/resource.json` |

### Limits

- **No sibling-file resolution.** Without `dirPath` (a file system concept), `extend` columns, resource-ref column options, and sub-resource views are not populated. Use `CroutonApiModule` (or `fromJson` from `@ghentcdh/crouton-api` with a `dirPath`) when those features are required.
- **`view: 'schemas'` returns `undefined`** when the resource has no configured views (same as the live endpoint).
- **Custom resources** (`kind: "custom"`): omit `schema`; column-derived views are built from `fieldInput` types.

## `compileResource`

Lower-level function used internally by `parseSchema`. Takes a validated `ResourceJson` and returns a `CompiledResource` (the in-memory representation before it is serialized to a payload).

```ts
import { compileResource } from '@ghentcdh/crouton-core';

const resource = compileResource(json, zodSchema, baseUrl, actions, tableActions, enums);
```

Use `parseSchema` unless you need the intermediate `CompiledResource` object.
