# crouton.json reference

`crouton.json` at the project root (or workspace root for Nx) tells the CLI where things live and configures
project-wide settings.

```json
{
  "title": "My App",
  "resourcesDir": "apps/backend/src/app/resources",
  "dataSourcesDir": "apps/backend/src/app/data-sources",
  "schemaExportName": "{Model}WithRelationsSchema",
  "enumsFile": "crouton.enums.json",
  "sidebarGroups": {
    "catalogue": { "label": "Catalogue", "position": 1 }
  },
  "autoSave": true,
  "i18n": {
    "defaultLanguage": "en",
    "languages": ["en", "nl"],
    "translationsDir": "translations"
  },
  "rules": { "hideTimestamps": true }
}
```

## Fields

Source of truth: `CroutonConfigSchema` in `@ghentcdh/crouton-core` (editor autocomplete via `$schema`).

| Field              | Type      | Required | Description                                                                                                    |
|--------------------|-----------|----------|----------------------------------------------------------------------------------------------------------------|
| `$schema`          | `string`  | no       | URL of the generated JSON Schema, for editor autocomplete/validation. Ignored at runtime.                      |
| `title`            | `string`  | **yes**  | App title, served via `GET /_app/layout` and shown in the admin sidebar header.                                |
| `resourcesDir`     | `string`  | **yes**  | Where resource directories live, relative to the project root.                                                 |
| `dataSourcesDir`   | `string`  | **yes**  | Where datasource folders live. The CLI scans this to discover datasources.                                     |
| `schemaExportName` | `string`  | no       | Template for a model's Zod export name; `{Model}` → Prisma model name. Default `{Model}WithRelationsSchema`.  |
| `enumsFile`        | `string`  | no       | Path to the shared enum registry. Default `crouton.enums.json`.                                               |
| `sidebarGroups`    | `object`  | no       | Groups for the sidebar navigation, keyed by slug. See [`sidebarGroups`](#sidebargroups).                       |
| `autoSave`         | `boolean` | no       | Save form fields automatically as the user edits them. Default `true`.                                         |
| `i18n`             | `object`  | no       | Translation settings. Omit for a single-language app. See [`i18n`](#i18n).                                     |
| `rules`            | `object`  | no       | Defaults used when columns are generated from a Prisma model. See [`rules`](#rules).                          |
| `authProvidersDir` | `string`  | no       | Auth-provider modules, relative to `crouton.json`. Default `src/app/auth-providers`.                           |
| `agentFiles`       | `object`  | no       | `{ "targets": ["claude", "cursor"] }` — which AI-agent file sets `crouton update` keeps in sync. Stored after the first run. |

## `rules`

Applied when columns are generated from a Prisma model: `crouton update` and the dev-mode resource editor
(`/_app/resources/sync|plan|apply`). Existing columns are not rewritten. All default to `true`.

| Field                  | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `hideIdInTable`        | Hide the id column in the table.                                            |
| `hideIdInForm`         | Hide the id column in the create/edit form.                                 |
| `hideIdInView`         | Hide the id column in the detail view.                                      |
| `hideTimestamps`       | Hide `createdAt` / `updatedAt` everywhere.                                  |
| `hideForeignKeys`      | Hide foreign-key columns (e.g. `authorId`); the relation column shows instead. |
| `includeRelations`     | Generate relation columns.                                                  |
| `hideRelationsInTable` | Hide relation columns in the table.                                         |
| `showRelationsInForm`  | Show relation columns in the form and view.                                 |
| `enumValueLabel`       | Show enum values by their label rather than the raw value.                  |
| `sharedEnums`          | Reference enums from `crouton.enums.json` instead of inlining their values. |
| `defaultOperations`    | CRUD operations enabled on generated resources (same shape as `operations`). |

## `sidebarGroups`

Keyed by slug. Each group accepts:

| Field      | Type     | Description                                                                   |
|------------|----------|-------------------------------------------------------------------------------|
| `label`    | `string` | Heading shown in the sidebar. Defaults to a title-cased version of the slug.  |
| `position` | `number` | Order of this group among top-level sidebar items.                            |

Resources opt in via `sidebar.group: "<slug>"` in their `resource.json`. See [resource.json → Sidebar](../2.resources/index.md#sidebar).

## `i18n`

| Field             | Description                                                                                         |
|-------------------|-----------------------------------------------------------------------------------------------------|
| `defaultLanguage` | Fallback language when a key is missing. Default `en`.                                              |
| `languages`       | All supported language codes (at least one).                                                        |
| `translationsDir` | Directory containing `<lang>.json` files, relative to the project root. Default `translations`.     |
| `displayNames`    | Custom display names per language code (e.g. `{ "wv": "West Vloams" }`), for codes `Intl.DisplayNames` can't name. |

See [Translations](../4.frontend/translations.md) for the full translation workflow.

## Auto-discovery

If no `crouton.json` is found, the CLI proposes one (and a `data-source.json` per detected datasource) and offers to
write it.

The `enumsFile` and `i18n.translationsDir` are loaded by walking up from the resources directory if not set explicitly.
The same walk is used by `CroutonApiModule.forResourceDir` on the backend.
