# crouton.json reference

<!-- TODO: auto-generate from Zod .meta() -->

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
  "autoSave": false,
  "i18n": {
    "defaultLanguage": "en",
    "languages": ["en", "nl"],
    "translationsDir": "translations"
  },
  "rules": {}
}
```

## Fields

| Field              | Type     | Required | Description                                                                                                    |
|--------------------|----------|----------|----------------------------------------------------------------------------------------------------------------|
| `title`            | `string` | **yes**  | App title shown in the admin UI.                                                                               |
| `resourcesDir`     | `string` | **yes**  | Where resource directories live, relative to the project root.                                                 |
| `dataSourcesDir`   | `string` | **yes**  | Where datasource folders live. The CLI scans this to discover datasources.                                     |
| `schemaExportName` | `string` | no       | Template for a model's Zod export name; `{Model}` → Prisma model name. Default `{Model}WithRelationsSchema`.  |
| `enumsFile`        | `string` | no       | Path to the shared enum registry. Default `crouton.enums.json`.                                               |
| `sidebarGroups`    | `object` | no       | Groups for the sidebar navigation — keyed by slug. See [Sidebar groups](#sidebar-groups).                      |
| `autoSave`         | `boolean`| no       | Enable autosave globally for all forms. Default `false`.                                                       |
| `i18n`             | `object` | no       | Translation settings. See [i18n](#i18n).                                                                       |
| `rules`            | `object` | no       | Global validation rules applied to all resources.                                                              |

## `sidebarGroups`

Keyed by slug. Each group accepts:

| Field      | Type     | Description                                                                   |
|------------|----------|-------------------------------------------------------------------------------|
| `label`    | `string` | Heading shown in the sidebar. Defaults to a title-cased version of the slug.  |
| `position` | `number` | Order of this group among top-level sidebar items.                            |

Resources opt in via `sidebar.group: "<slug>"` in their `resource.json`. See [resource.json → Sidebar](../2.resources/index.md#sidebar).

## `i18n`

| Field             | Description                                                     |
|-------------------|-----------------------------------------------------------------|
| `defaultLanguage` | Fallback language when a key is missing.                        |
| `languages`       | All supported languages. Controls cache size.                   |
| `translationsDir` | Directory containing `<lang>.json` files, relative to project root. |

See [Translations](../4.frontend/translations.md) for the full translation workflow.

## Auto-discovery

If no `crouton.json` is found, the CLI proposes one (and a `data-source.json` per detected datasource) and offers to
write it.

The `enumsFile` and `i18n.translationsDir` are loaded by walking up from the resources directory if not set explicitly.
The same walk is used by `CroutonApiModule.forResourceDir` on the backend.
