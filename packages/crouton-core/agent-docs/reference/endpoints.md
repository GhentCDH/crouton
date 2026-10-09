# HTTP endpoints reference

<!-- TODO: auto-generate from Zod .meta() -->

All routes listed below are relative to the crouton API base URL. When `prefix` is set in `CroutonApiModule`, prepend
it to every route (e.g. `prefix: 'api'` → `/api/books`, `/api/_app/layout`).

## Resource endpoints

For a resource with `"route": "books"`:

| Endpoint                                        | Method   | Description                                                            |
|-------------------------------------------------|----------|------------------------------------------------------------------------|
| `GET /books`                                    | `GET`    | Paginated list with filtering (`?filter=field:value:op`) and sorting   |
| `GET /books/:id`                                | `GET`    | Single record                                                          |
| `POST /books`                                   | `POST`   | Create, validated against the Zod schema                               |
| `PUT /books/:id`                                | `PUT`    | Full replace — all required fields must be present                     |
| `PATCH /books/:id`                              | `PATCH`  | Partial update — fields optional (auto `.partial()`)                   |
| `DELETE /books/:id`                             | `DELETE` | Delete (when enabled)                                                  |
| `GET /books/schemas`                            | `GET`    | Table / form / view / filter schemas for the frontend                  |
| `GET /books/definition`                         | `GET`    | Enabled operations + schemas                                           |
| `POST /books/procedure/:actionId/:recordId`     | `POST`   | Row-level [actions](../2.resources/actions.md)                         |
| `POST /books/table-action/:actionId`            | `POST`   | Table-level [actions](../2.resources/actions.md)                       |

Each operation is only registered when enabled in `operations`. See [Operations](../2.resources/operations.md).

## Application endpoints

| Endpoint                      | Method   | Description                                                                              |
|-------------------------------|----------|------------------------------------------------------------------------------------------|
| `GET /_app/layout`            | `GET`    | Sidebar items for all resources (respects `sidebar.hide` / `sidebar.position`)           |
| `GET /_app/translations`      | `GET`    | UI + validation translation dictionary for the current language                         |
| `GET /crouton/status.json`    | `GET`    | Health check: databases, resource load status, i18n. Always HTTP 200.                   |

## Sub-resource endpoints

When a resource has a nested relation child (e.g. `books` → `chapters`):

| Endpoint                                        | Method   | Description                          |
|-------------------------------------------------|----------|--------------------------------------|
| `GET /books/:id/chapters`                       | `GET`    | List chapters for one book           |
| `GET /books/:id/chapters/:childId`              | `GET`    | One chapter                          |
| `POST /books/:id/chapters`                      | `POST`   | Create chapter under that book       |
| `PUT /books/:id/chapters/:childId`              | `PUT`    | Replace chapter                      |
| `PATCH /books/:id/chapters/:childId`            | `PATCH`  | Partial update                       |
| `DELETE /books/:id/chapters/:childId`           | `DELETE` | Delete chapter                       |

## Dev-mode endpoints (gated by `CROUTON_SCHEMA_EDITOR=true`)

| Endpoint                         | Method   | Description                                                                             |
|----------------------------------|----------|-----------------------------------------------------------------------------------------|
| `GET /<route>/resource-columns`  | `GET`    | Editable column list for one resource.                                                  |
| `PATCH /<route>/resource.json`   | `PATCH`  | Merge a column patch into that resource's `resource.json`.                              |
| `GET /<route>/resource-json-raw` | `GET`    | Raw resource.json for the `ResourceJsonEditor` component.                               |
| `PUT /<route>/resource-json-raw` | `PUT`    | Save a resource.json from the `ResourceJsonEditor` component.                           |
| `GET /_app/resources/models`     | `GET`    | Prisma models, whether each has a resource, and whether the running client can use it.  |
| `POST /_app/resources/pull`      | `POST`   | `db pull` + case-format + `generate` for a datasource; needs DB credentials.            |
| `POST /_app/resources/restart`   | `POST`   | Disconnects datasources and exits the process.                                          |
| `POST /_app/resources/sync`      | `POST`   | Generate a `resource.json` for a single model.                                          |
| `POST /_app/resources/plan`      | `POST`   | Diff resources against the database; dry run.                                           |
| `POST /_app/resources/apply`     | `POST`   | Write the resources chosen from a `plan` response.                                      |

See [Resource editor](../5.tooling/resource-editor.md) for full details on the dev-mode endpoints.

## Query parameters for list endpoints

| Parameter      | Description                                                                          |
|----------------|--------------------------------------------------------------------------------------|
| `page`         | Page number (1-based). Default `1`.                                                  |
| `pageSize`     | Records per page. Default `20`.                                                      |
| `sort`         | Field to sort by. Dotted paths (e.g. `author.name`) work for relation fields.        |
| `sortDir`      | `asc` or `desc`. Default `asc`.                                                      |
| `q`            | Free-text search across `searchable: true` columns.                                  |
| `filter`       | Field-level filters: `field:value:operator`. Multiple filters are ANDed.              |
| `Accept-Language` | Requested language for translated labels. Negotiated via standard q-value parsing. |
