---
description: Decision tables for pairs that are easy to confuse in crouton.
---

# Decision tables

## `kind` vs `adapter`

| | `kind: "custom"` | `adapter: "custom"` in `data-source.json` |
|---|---|---|
| **What it is** | A per-resource flag in `resource.json` | A per-datasource flag in `data-source.json` |
| **Schema source** | Column `type`s in `resource.json` (no `schema.ts`) | Normal `schema.ts` per resource |
| **Data access** | Developer writes a `repository.ts` per resource | Developer writes one adapter for the datasource; all resources on it use it |
| **When to use** | One-off resource with non-standard data access (remote API, computed view, bespoke queries) | Non-Prisma backend shared by many resources (e.g. Elasticsearch, REST API) |
| **`model` in resource.json** | Must be **omitted** | Required (the adapter uses it as the model key) |
| **`repository.ts`** | Required (unless the datasource adapter handles it) | Not needed per resource |
| **Example** | Zotero proxy resource | Elasticsearch datasource backing 10 resources |
| **Common mistake** | Using `kind: "custom"` when you only need an adapter — now you write a `repository.ts` for every resource | Using `adapter: "custom"` when resources have genuinely different data access shapes |

## `storeValue` autocomplete vs relation column

| | `fieldInput.type: "autocomplete"` + `storeValue: true` | `fieldInput.format: "relation"` (manyToOne) |
|---|---|---|
| **What is stored** | The raw FK value (string or number) | The raw FK value, via Prisma relation |
| **What is displayed** | The `labelKey` field from the remote endpoint | The `displayKey` field from the related resource |
| **Backend include** | Not included automatically — you fetch it | Listed in `include`; Prisma joins it |
| **Filtering/searching** | By the stored value only | By any column on the related resource |
| **When to use** | Simple lookup with no need for the related record's other fields | Full Prisma relation with include, filters, and sub-resource display |
| **Config** | `fieldInput.options.storeValue: true`, `options.uri` or `options.resource` | `fieldInput.type: "autocomplete"`, `relationType: "manyToOne"`, `resource: "./other.resource"` |
| **Common mistake** | Forgetting `storeValue: true` — stores the whole `{ value, label }` object in a text column | Using a relation column when there is no Prisma relation in the schema |

## `crouton update` vs hand edits

| | `crouton update resources` | Hand-editing `resource.json` |
|---|---|---|
| **What it owns** | `schema.ts` (fully regenerated), new columns detected in Prisma | Everything else in `resource.json` |
| **What it does NOT overwrite** | `fieldInput`, `label`, `searchable`, `sortable`, `filterable`, `hiddenInTable`, `hiddenInForm`, enum refs, relations | N/A |
| **When to run** | After any Prisma schema change (new model, new column, renamed field) | Anytime you want to configure display, inputs, or relations |
| **Risk** | Adds columns you have not reviewed yet — always check the diff | Edits to `schema.ts` are overwritten on the next `crouton update` |
| **Common mistake** | Editing `schema.ts` by hand — it will be overwritten | Not running `crouton update` after a migration — resource.json gets out of sync with the model |

## `columns` vs `calculatedColumns`

| | `columns` | `calculatedColumns` |
|---|---|---|
| **What it is** | Regular table columns — maps to a Prisma model field | A raw SQL expression evaluated in the SELECT clause |
| **Prisma model field required** | Yes (for `kind: "prisma"`) | No |
| **Editable in form** | Yes (by default) | No — read-only |
| **Filterable / searchable** | Yes | Yes (filtered as SQL) |
| **When to use** | Any field in the Prisma model | Derived values — string concatenation, coalesced fallbacks, aggregates you cannot express as a Prisma `select` |
| **Available on `kind: "custom"`** | Yes | **No** — custom resources have no table to run SQL against |
| **Example** | `"title": { "searchable": true }` | `{ "id": "fullName", "expression": "first_name || ' ' || last_name" }` |
| **Common mistake** | Using `calculatedColumns` on a `kind: "custom"` resource — crouton rejects it at load time | Trying to make a `calculatedColumn` editable — it is always read-only |
