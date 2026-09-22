# @ghentcdh/crouton-prisma

Prisma generator that produces Zod validation schemas from your Prisma models. Used as part of
the [Crouton](https://github.com/ghentcdh/crouton) framework.

## What it does

Runs as a Prisma generator and:

1. Normalizes relation field names in your schema (`normalize-schema.json` rules)
2. Invokes [`zod-prisma-types`](https://github.com/chrishoermann/zod-prisma-types) on a temporary schema to generate Zod
   types
3. Fixes missing Zod imports in the generated output

## Installation

```sh
pnpm add -D @ghentcdh/crouton-prisma prisma zod-prisma-types
```

## Usage

### Prisma schema

Add the `crouton` generator block to `prisma/default/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../generated/default/client/src"
}

generator crouton {
  provider  = "crouton-prisma"
  zodOutput = "../../generated/default/types/src"
}

```

| Option      | Required | Description                                      |
|-------------|----------|--------------------------------------------------|
| `provider`  | yes      | Must be `"crouton-prisma"`                       |
| `zodOutput` | yes      | Path (relative to the schema file) for Zod types |

### Prisma config

Create `prisma/default/prisma.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/default/schema.prisma',
  migrations: {
    path: 'prisma/default/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

### Generate

```sh
prisma generate --schema prisma/default/schema.prisma
```

Or via the Crouton CLI when using the full Crouton setup.

## Peer dependencies

| Package            | Version   |
|--------------------|-----------|
| `prisma`           | `>=6.0.0` |
| `zod-prisma-types` | `>=3.0.0` |
