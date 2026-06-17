# Crouton API

`@ghentcdh/crouton-api` is the NestJS side of crouton. It turns `resource.json` definitions into fully working CRUD endpoints: controllers, repositories, validation, and the `/schemas` endpoints consumed by `@ghentcdh/crouton-vue`.

## Installation

```sh
pnpm add @ghentcdh/crouton-api
```

Peer dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`, `@anatine/zod-nestjs`, `@prisma/client`, `zod`.

## Quick start

Register the module and point it at your resource configuration:

```ts
import { CroutonApiModule } from '@ghentcdh/crouton-api';
import { resolve } from 'node:path';

@Module({
  imports: [
    CroutonApiModule.forResourceDir(
      resolve(__dirname, 'resources'),
      resolve(__dirname, 'data-sources'),
      {
        baseUrl: process.env.BE_API_URL || 'http://localhost:3000',
        title: 'My App',           // served to the frontend via GET /_app/layout
        sidebarGroups: {           // optional — group resources in the sidebar
          content: { label: 'Content', position: 1 },
        },
      },
    ),
  ],
})
export class AppModule {}
```

For every registered resource you get:

- `GET /<route>` — paginated list with filtering and sorting
- `GET /<route>/:id` — detail
- `POST /<route>` — create with Zod validation
- `PATCH /<route>/:id` — update with Zod validation
- `DELETE /<route>/:id` — delete (when enabled)
- `GET /schemas/...` — JSON schemas driving the Vue components

## CroutonConfig options

| Field | Type | Description |
|---|---|---|
| `baseUrl` | `string` | Base URL of the backend API. |
| `title` | `string` | Application title served to the frontend via `GET /_app/layout`. Shown in the admin sidebar header. |
| `sidebarGroups` | `Record<string, SidebarGroupConfig>` | Optional sidebar group definitions (label, position). Resources opt in via `sidebar.group` in `resource.json`. |
| `enumsFile` | `string` | Explicit path to `crouton.enums.json`. Defaults to auto-discovery from the resources dir. |

## Building blocks

- **Resource config loaders** — load resource definitions from the file system (`FsResourceConfigLoader`) or implement your own `ResourceConfigLoader`.
- **Resource config registry** — central registry of all known resources.
- **Controller & repository factories** — generate typed NestJS controllers and Prisma-backed read/write repositories per resource.
- **Data sources** — abstraction over the persistence layer.
- **Zod validation pipe** — request validation derived from the resource schema.
