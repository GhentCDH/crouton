# Packages

Crouton is split into focused packages. Most projects need only two: `@ghentcdh/crouton-api` on the backend and
`@ghentcdh/crouton-vue` on the frontend.

## Published packages

| Package                       | Install           | Purpose                                                                                                     |
|-------------------------------|-------------------|-------------------------------------------------------------------------------------------------------------|
| `@ghentcdh/crouton-api`       | runtime           | NestJS module — turns `resource.json` definitions into CRUD endpoints, controllers, and schema endpoints    |
| `@ghentcdh/crouton-vue`       | runtime           | Vue 3 admin UI — bundles `crouton-forms-vue` + `crouton-editor-vue` into one install                       |
| `@ghentcdh/crouton-forms-vue` | runtime           | Schema-driven forms (CroutonForm, CroutonAutoSave, JsonForms renderers). Included in `crouton-vue`.         |
| `@ghentcdh/crouton-editor-vue`| runtime           | ResourceJsonEditor component and visual builder. Included in `crouton-vue`.                                 |
| `@ghentcdh/crouton-core`      | runtime           | Shared framework-agnostic foundation: schemas, builders, filter/request models. Used by api and vue.        |
| `@ghentcdh/crouton-prisma`    | devDependency     | Prisma generator that produces Zod schemas from your Prisma models. Used in the prisma schema file.         |
| `@ghentcdh/crouton-cli`       | devDependency     | `crouton` CLI — `update resources`, `create-datasource`, `create-resource`, `translations init/update`.     |
| `@ghentcdh/create-crouton`    | used via `npx`    | Project scaffolding: new monorepo or standalone backend+frontend from scratch.                              |
| `@ghentcdh/add-crouton`       | used via `npx`    | Add crouton to an existing NestJS project (additive, never overwrites existing files).                      |

`@ghentcdh/crouton-codegen` is an internal package used by `crouton-cli` and `crouton-api`. It is not published for direct use.

## What to install

| Scenario | Install |
|----------|---------|
| NestJS backend only | `@ghentcdh/crouton-api` + `@ghentcdh/crouton-prisma` (dev) + `@ghentcdh/crouton-cli` (dev) |
| Vue 3 frontend only | `@ghentcdh/crouton-vue` |
| Full stack | `@ghentcdh/crouton-api` + `@ghentcdh/crouton-vue` + `@ghentcdh/crouton-prisma` (dev) + `@ghentcdh/crouton-cli` (dev) |
| Use `ResourceJsonEditor` without the full admin UI | `@ghentcdh/crouton-editor-vue` directly |
| Use forms without the admin UI | `@ghentcdh/crouton-forms-vue` directly |

## `crouton-vue` bundles `crouton-forms-vue` + `crouton-editor-vue`

Installing `@ghentcdh/crouton-vue` gives you both — you do not need to install the sub-packages separately. Install
the sub-packages directly only if you need them in isolation (e.g. you have a custom admin shell and just want the
form component).

## Peer dependencies

| Package              | Peers                                                                                                          |
|----------------------|----------------------------------------------------------------------------------------------------------------|
| `crouton-api`        | `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`, `@prisma/client`, `zod`                                   |
| `crouton-vue`        | `vue` >=3, `vue-router` >=4, `axios`, `@jsonforms/core`, `@ghentcdh/ui`, `@ghentcdh/json-forms-vue`, `zod`    |
| `crouton-prisma`     | `prisma` >=7                                                                                                   |

## Version alignment

All crouton packages share the same version number. Install them at the same version to avoid compatibility issues.

```sh
pnpm add @ghentcdh/crouton-api@0.0.1-alpha.80 @ghentcdh/crouton-vue@0.0.1-alpha.80
```
