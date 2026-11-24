# Packages

Crouton is split into focused packages. Most projects need only two: `@ghentcdh/crouton-api` on the backend and
`@ghentcdh/crouton-vue` on the frontend.

## Published packages

| Package                    | Install        | Purpose                                                                                                  |
|----------------------------|----------------|----------------------------------------------------------------------------------------------------------|
| `@ghentcdh/crouton-api`    | runtime        | NestJS module — turns `resource.json` definitions into CRUD endpoints, controllers, and schema endpoints |
| `@ghentcdh/crouton-vue`    | runtime        | Vue 3 admin UI — the one frontend package to install                                                     |
| `@ghentcdh/crouton-core`   | runtime        | Shared framework-agnostic foundation: schemas, builders, filter/request models. Used by api and vue.     |
| `@ghentcdh/crouton-auth`   | runtime        | Auth-provider definitions (`defineAuthProvider`, role guards) and the `auth-provider.json` schema.       |
| `@ghentcdh/crouton-prisma` | devDependency  | Prisma generator that produces Zod schemas from your Prisma models. Used in the prisma schema file.      |
| `@ghentcdh/crouton-cli`    | devDependency  | `crouton` CLI — `update resources`, `create resource`, `create datasource`, `init translations`, `update translations`.  |
| `@ghentcdh/create-crouton` | used via `npx` | Project scaffolding: new monorepo or standalone backend+frontend from scratch.                           |

## Not published yet

| Package                    | Notes                                                                                |
|----------------------------|--------------------------------------------------------------------------------------|
| `@ghentcdh/add-crouton`    | Additive setup for existing NestJS projects. Build from the repository until released. |
| `@ghentcdh/crouton-mcp`    | MCP server for LLM agents. Build from the repository until released.                  |

## Internal packages (do not install directly)

| Package                        | Notes                                                                        |
|--------------------------------|------------------------------------------------------------------------------|
| `@ghentcdh/crouton-forms-vue`  | Re-exported by `crouton-vue`. Import from `@ghentcdh/crouton-vue`.           |
| `@ghentcdh/crouton-ui-vue`     | Re-exported by `crouton-vue`. Import from `@ghentcdh/crouton-vue`.           |
| `@ghentcdh/crouton-editor-vue` | Re-exported by `crouton-vue`. Import from `@ghentcdh/crouton-vue`.           |
| `@ghentcdh/crouton-codegen`    | Private — not published. Used internally by the CLI, Prisma generator, and scaffolders. |

## What to install

| Scenario              | Install                                                                                                              |
|-----------------------|----------------------------------------------------------------------------------------------------------------------|
| NestJS backend only   | `@ghentcdh/crouton-api` + `@ghentcdh/crouton-prisma` (dev) + `@ghentcdh/crouton-cli` (dev)                           |
| Vue 3 frontend only   | `@ghentcdh/crouton-vue`                                                                                              |
| Auth providers        | `@ghentcdh/crouton-auth` (in addition to the backend / frontend packages)                                            |
| Full stack            | `@ghentcdh/crouton-api` + `@ghentcdh/crouton-vue` + `@ghentcdh/crouton-prisma` (dev) + `@ghentcdh/crouton-cli` (dev) |

## Peer dependencies

| Package          | Peers                                                                                                                       |
|------------------|-----------------------------------------------------------------------------------------------------------------------------|
| `crouton-api`    | `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`, `@prisma/client`, `@prisma/internals`, `zod` |
| `crouton-vue`    | `@ghentcdh/crouton-core`, `vue` >=3, `vue-router` ^5, `axios`, `@jsonforms/core`, `vee-validate` >=5.0.0-beta.0, `zod`        |
| `crouton-core`   | `@jsonforms/core`, `zod`                                                                                                    |
| `crouton-auth`   | `zod`                                                                                                                       |
| `crouton-prisma` | `prisma` >=7, `zod-prisma-types` >=3                                                                                        |

## Version alignment

All crouton packages share the same version number. Install them at the same version to avoid compatibility issues.

```sh
pnpm add @ghentcdh/crouton-api@0.2.0 @ghentcdh/crouton-vue@0.2.0
```

For a prerelease, use the same version for every package (e.g. `@0.2.0-rc.0`).
