Status: planned
# CRUD Operations Tests Plan — generated endpoints over real HTTP + real database

## Goal

Test the **generated CRUD calls** end-to-end: `findAll`, `findOne`, `create`,
`update`, `patch`, `delete`, `unique`, actions and the sub-resource variants —
through real HTTP against a real Prisma database. Special focus on **relations**:
manyToOne, oneToMany, manyToMany (implicit + explicit join table), relation
**counts** (`_count`) in the list, includes on findOne, and writes that
connect/disconnect relations.

Today these paths are covered only by unit specs with mocked Prisma delegates
(`hidden-relation-count.spec.ts`, `unresolved-count-clause.spec.ts`,
`sql.helpers.spec.ts`, …) — they check the *query shape*, never that Prisma
accepts it or that the response is right.

Builds on the HTTP infrastructure from `PARSE_SCHEMA_TESTS_PLAN.md` (Part 2:
`@nestjs/testing`, `supertest`, `unplugin-swc`, `bootCase`).

## What is generated (from `operations/register-*.ts`)

| Endpoint | Operation | Notes |
|---|---|---|
| `GET /<route>` | findAll | `page`, `pageSize`, `sort`, `sortDir`, `filter[]` (`field:value:op`), `q`; envelope `{ data, request: { count, page, pageSize, totalPages, … } }` |
| `GET /<route>/:id` | findOne | `includeInFindOne` sub-resources + `include` |
| `POST /<route>` | create | value-label unwrap, sub-resource keys stripped, `beforeWrite` |
| `PUT /<route>/:id` | update | |
| `PATCH /<route>/:id` | patch | |
| `DELETE /<route>/:id` | delete | |
| `GET /<route>/unique` | unique check | static, registered before `:id` |
| `POST /<route>/procedure/<action>/:recordId` | action | |
| `POST /<route>/table-action/<action>` | table action | |
| `GET/POST/PUT/PATCH/DELETE /<route>/:id/<child>[/:childId]` | sub-resource CRUD | `findAllByParent`, `findOneChild`, `createChild`, `updateChild`, `deleteChild` |

## Database

**Real Prisma 7 client against a real database**, one schema dedicated to tests.

Options:

| | Postgres (Testcontainers) | SQLite file |
|---|---|---|
| Prod parity | ✓ same as the apps | ✗ |
| Calculated columns raw SQL (`$1` placeholders, `CAST … AS BOOLEAN`) | ✓ | risky — needs a check |
| Case-insensitive `contains` / `q` search | ✓ (`mode: insensitive`) | differs |
| Needs Docker in CI | yes | no |
| Speed | container start ~3–5 s per run | fast |

**Proposal: Postgres via `@testcontainers/postgresql`** (one container per test run in
vitest `globalSetup`, one database/schema per test file for isolation). SQLite as a
later "fast mode" only if CI can't run Docker.

### Test schema

`packages/crouton-api/test/prisma/schema.prisma` (generated to
`test/prisma/generated`, `prisma db push` in `globalSetup`):

```prisma
model Author   { id String @id @default(cuid()) name String  books Book[] }
model Category { id String @id @default(cuid()) name String  slug String @unique  books Book[] }        // implicit m2m
model Tag      { id Int    @id @default(autoincrement()) label String  bookTags BookTag[] }             // int id
model Book {
  id String @id @default(cuid())
  title String
  isbn String? @unique
  publishedYear Int?
  status String @default("draft")                  // enum via crouton.enums.json
  authorId String
  author Author @relation(fields: [authorId], references: [id])  // manyToOne
  categories Category[]                             // implicit manyToMany
  bookTags BookTag[]                                // explicit manyToMany
  loans Loan[]                                      // oneToMany (sub-resource)
  reviews Review[]                                  // oneToMany, hidden in table (no _count)
}
model BookTag  { bookId String  tagId Int  addedAt DateTime @default(now())
                 book Book @relation(fields: [bookId], references: [id], onDelete: Cascade)
                 tag  Tag  @relation(fields: [tagId], references: [id])
                 @@id([bookId, tagId]) }            // explicit join table with extra field
model Loan     { id String @id @default(cuid()) loanedAt DateTime @default(now()) returnedAt DateTime?
                 bookId String  book Book @relation(fields: [bookId], references: [id], onDelete: Cascade) }
model Review   { id String @id @default(cuid()) rating Int  bookId String  book Book @relation(fields: [bookId], references: [id]) }
model Shelf    { code String @id  name String  @@map("shelves") }   // custom idField + @@map → `table`
```

Plus one **custom** resource (`repository.ts` or the existing `in-memory.adapter.ts`)
to check custom resources go through the same endpoints.

### Fixtures

```
packages/crouton-api/test/crud/
  resources/<resource>/resource.json    # + schema.ts (generated or hand-written)
  crouton.enums.json
  seed.ts                               # deterministic seed (fixed ids, known counts)
  datasources/                          # prisma datasource pointing at the test client
```

Seed with **known numbers** so assertions are exact, e.g.:

| Book | author | categories | tags | loans | reviews |
|---|---|---|---|---|---|
| `b1` "Dune" | a1 | 2 | 3 | 2 | 1 |
| `b2` "Emma" | a2 | 0 | 1 | 0 | 0 |
| `b3` "Ulysses" | a1 | 1 | 0 | 5 | 2 |
| … ~25 books total so paging has >1 page | | | | | |

## Test harness

`test/crud/harness.ts`:

- `globalSetup`: start Postgres container, `prisma db push --schema test/prisma/schema.prisma`.
- per file: `createDb()` → fresh schema (`?schema=t_<random>`), `db push`, `seed()`.
- `bootApp({ resources, appConfig })` → `CroutonApiModule.forLoader(loader, configs,
  [{ config, adapter: new PrismaDataSourceAdapter(prisma) }], { baseUrl, prefix: 'api' })`
  → `Test.createTestingModule` → `app.init()` → `supertest`.
- `loadConfig()` mocked (as in the schema plan) so `enumsFile` points at the fixture.
- `beforeEach` reseed **or** wrap each test in a transaction and roll back
  (Prisma has no nested-tx rollback API → reseed with `TRUNCATE … CASCADE`, fast enough).
- `afterAll`: `app.close()`, `prisma.$disconnect()`, drop schema.

## Test suites

```
packages/crouton-api/test/crud/
  find-all.e2e.spec.ts
  find-one.e2e.spec.ts
  write.e2e.spec.ts            # create / update / patch / delete
  relations.e2e.spec.ts        # m2o, o2m, m2m reads + writes + counts
  sub-resource.e2e.spec.ts     # /:id/<child> CRUD
  unique-and-actions.e2e.spec.ts
  hooks.e2e.spec.ts
  custom-resource.e2e.spec.ts
  errors.e2e.spec.ts
```

### findAll

- default params → page 1, pageSize 20, sort `id asc`; envelope shape and `totalPages`
- paging: `page=2&pageSize=10` → right slice; `count` is the total, not the page size
- page past the end → empty `data`, correct `count`
- sort asc/desc on scalar; sort on a field not in the list select → ignored (no 500)
- sort on a valueLabel column → sanitized
- filter per operator: `contains`, `not_contains`, `equals`, `not_equals`, `gt`, `lt`,
  `isnull`, `isnotnull`; value containing `:`; multiple filters → AND
- filter on a relation path (`author.name:Herbert`)
- `q` free-text search over lookup labels (+ combined with a filter → AND)
- `count` respects `filter` and `q` (same where as the list)
- enum column → `{ value, label }` envelope in the response
- calculated columns present with correct values; failing expression → default value, no 500
- `@@map` resource (`Shelf`) with `table` + custom `idField`

### findOne

- by string id, by int id (`idType: number`), by custom `idField`
- unknown id → 404 with message
- `includeInFindOne` relations present; hidden in form+view → not loaded
- `include` incl. nested (`bookTags.tag`) returned
- child sort (`fieldInput.options.sort`) applied to included lists

### create / update / patch / delete

- create → 201, row in DB (assert via `prisma` directly, not only the response)
- defaults applied (`status = draft`)
- value-label input (`{ value, label }`) unwrapped before write
- sub-resource count keys in the payload (e.g. `loans: 3`) stripped, not written
- zod validation: missing required / wrong type → 400 with field errors
- update replaces; patch only changes sent fields
- update/patch/delete unknown id → 404 (Prisma `P2025` mapping)
- unique violation (`isbn`, `slug`) → mapped error (409/400, pin which) with field name
- delete → row gone; delete with dependent rows and no cascade (`Review`) → pin behaviour
  (FK error → clean 4xx, not a 500)

### Relations (the main focus)

**manyToOne (`Book.author`)**
- findAll includes `author` (auto-include for manyToOne), valueLabel `{ value, label }`
- filter/sort on `author.name`
- create/update with `authorId` (plain and as `{ value, label }`)
- autocomplete: `GET /api/authors?q=Her` returns lookup-shaped rows

**oneToMany (`Book.loans`, `Book.reviews`)**
- findAll: `loans` column holds the **count** (`_count.loans`) — exact numbers from the seed
- relation hidden in table (`reviews`) → no `_count` in the query and no column in the row
- `include: ["loans"]` + counted → findAll still returns the count, not the rows
- findOne returns the actual child rows (includeInFindOne)
- counts update after creating/deleting a child through the sub-resource endpoint

**manyToMany implicit (`Book.categories`)**
- findAll: count of categories per book (`b1` → 2, `b2` → 0)
- findOne: the category list
- filter books by category (`categories.some…` — pin whether supported; if not, note it)
- **write contract** — today crouton does **not** translate an id list into a Prisma
  relation write (only `{ value, label }` → value). Tests pin the current behaviour:
  - `{ categories: { set: [{ id: 'c1' }] } }` → works (passed through)
  - `{ categories: { connect: [...] } }` / `{ disconnect: [...] }` → works
  - `{ categories: ['c1', 'c2'] }` or `[{ value, label }]` (what the form sends) → **currently
    fails?** → decide: add conversion to `set` in `prepareWrite` for manyToMany columns
    (see open questions); write the test first, red until fixed
- update replaces the set; patch without `categories` leaves them untouched
- deleting a book removes join rows; categories stay

**manyToMany explicit (`Book.bookTags` → `Tag`)**
- count via join table
- nested include `bookTags.tag` on findOne
- create a `BookTag` through the sub-resource endpoint (`POST /api/books/b1/bookTags`)
  incl. extra field `addedAt`; composite id on child update/delete (pin support)
- int-id `Tag` (`idType: number`) on both sides

### Sub-resources (`/:id/<child>`)

- `GET /api/books/b1/loans` → only b1's loans, paging + `count` scoped to the parent
- `GET /api/books/b1/loans/:loanId` → 200; loan of another book → 404
- `POST` → `bookId` set from the URL even if the body says otherwise
- `PUT`/`PATCH`/`DELETE` scoped to the parent; wrong parent → 404
- non-createable child fields (`createable: false`) stripped on create
- relation writes inside child payload (`include` keys only when they are Prisma writes)
- custom child in prisma parent (`repository.ts` `*ByParent`) through the same URLs

### unique, actions, hooks

- `GET /api/books/unique?field=isbn&value=…` → `{ unique: false/true }`; `excludeId` on edit;
  scoped uniqueness (`scope` JSON); field not marked unique → refused
- `/unique` not swallowed by `/:id` (route order)
- action / table-action routes call the handler with record id / no id
- hooks fire with the right context: `beforeFindAll` (params), `afterRead`,
  `afterFindAll`, `beforeWrite` (can change data), `afterWrite`; parent context on child ops

### Custom resource

- same envelope for findAll (`findAllWithCount` path)
- CRUD through `repository.ts`; missing operation → not registered (404/405)

### Errors / robustness

- non-existent route/operation disabled in `operations` → 404
- malformed filter string → ignored or 400 (pin)
- `pageSize=0`, negative page → 400
- a Prisma error that is not mapped → 500 without leaking SQL (pin the message)

## Steps

1. Infra (shared with the schema plan): devDeps, swc in vitest, separate
   `vitest.e2e.config.ts` + `test-e2e` nx target so unit tests stay fast.
2. Add `@testcontainers/postgresql`, test prisma schema, generate + `db push` in `globalSetup`.
3. Fixtures (resources for every model) + deterministic `seed.ts`.
4. Harness `bootApp` + one smoke test (`GET /api/books` → 200, count = seed).
5. `find-all` + `find-one`.
6. `write` (create/update/patch/delete, validation, unique, 404).
7. `relations` — counts and reads first, then the manyToMany write contract.
8. `sub-resource`.
9. `unique-and-actions`, `hooks`, `custom-resource`, `errors`.
10. CI: run `pnpm nx run crouton-api:test-e2e` in a job with Docker.

## Open questions

- **manyToMany writes:** should crouton convert `categories: [id…]` / `[{value,label}]`
  to `{ set: [{ id }] }` (create: `connect`) automatically for `relationType: manyToMany`?
  Proposal: yes, in `prepareWrite`, driven by the column config — tests written first.
- Postgres via Testcontainers vs SQLite? Proposal: Postgres (prod parity, raw SQL).
- Reseed per test vs per file? Proposal: truncate + reseed per test in write suites,
  once per file for read-only suites.
- Error status for unique violation (409 vs 400) and FK violation on delete — pin
  what exists, or decide now?
- Filtering on a manyToMany relation (`categories.name:…`) — in scope as a feature, or
  only document that it is not supported?
