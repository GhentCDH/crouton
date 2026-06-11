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

@Module({
  imports: [
    CroutonApiModule.register({
      // load resource.json files from disk
    }),
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

## Building blocks

- **Resource config loaders** — load resource definitions from the file system (`FsResourceConfigLoader`) or implement your own `ResourceConfigLoader`.
- **Resource config registry** — central registry of all known resources.
- **Controller & repository factories** — generate typed NestJS controllers and Prisma-backed read/write repositories per resource.
- **Data sources** — abstraction over the persistence layer.
- **Zod validation pipe** — request validation derived from the resource schema.
