# Crouton Core

`@ghentcdh/crouton-core` contains the shared, framework-agnostic foundation of crouton: schema creation, builders, filter and request/response models. It is an **internal build-time package** — it is bundled into both `@ghentcdh/crouton-api` and `@ghentcdh/crouton-vue` and never published separately.

## What lives here

- **Schema creation** (`create-schema`, `schema.utils`, `zod.types`) — turn a `resource.json` definition into Zod schemas for validation and JSON schemas for the UI.
- **`fromJson` builder** — parse and normalize a raw `resource.json` file.
- **Layout builders** (`layout/`) — programmatically build JSON Forms UI layouts: controls, groups, categories.
- **Table builders** (`table/`) — column definitions and utilities for data tables.
- **Filter model** (`filter`) — filter definitions shared between API querying and UI filter components.
- **Request / response models** — pagination, sorting, and list-response contracts shared by both sides.
- **Relation types** — typing for relations between resources.
