# Unique Async Validation Plan

Let a column declare `unique: true` (e.g. an email) so that, while the user
types, the form asynchronously checks whether that value already exists and
shows a field error before submit — backed by a real server-side guarantee so
the check can't be raced or bypassed.

## 1. Motivation

Today there is no notion of uniqueness anywhere in the stack:

- `JsonColumnSchema` (`crouton-core/src/lib/resource/Column.ts`) has no
  `unique` flag.
- The form validation engine (`FormComponent.vue`) builds one Zod schema from
  the JSON Schema via `fromJSONSchema` and hands it to vee-validate. Zod/JSON
  Schema can express `minLength`, `format`, `required` — but **not** "this
  value is free in the database". That is inherently async and server-side.
- `WriteRepository.create` is a bare `this.prismaModel.create({ data })` with
  **no** P2002 (unique-constraint) handling, so a DB-level collision surfaces
  as an unhandled Prisma error → 500, not a friendly field error.

Goal: a first-value example (email) that validates as-you-type:

```jsonc
// resource.json column
{
  "id": "email",
  "type": "string",
  "fieldInput": { "type": "string", "options": { "format": "email" } },
  "unique": true
}
```

→ user types `ada@x.com`; if a row with that email already exists the field
shows *"This email is already taken"*, submit is blocked, and even if two users
race the check the server rejects the second create with the same field error.

## 2. Decisions (proposed — confirm before Phase 1)

1. **Declaration lives on the column** as `unique`, not on `fieldInput`
   (uniqueness is a data-integrity fact, not a rendering concern). Accept a
   boolean now, shaped so it can grow into an object later (`scope`,
   `caseInsensitive`, `message`) without a breaking change.
2. **Two layers, both required.** A client async check for UX (fast feedback,
   blocks submit) **and** a server guarantee (P2002 → field error). The client
   check is advisory; the server is the source of truth. Never ship only the
   client half.
3. **Dedicated check endpoint**, not reuse of `findAll`. `findAll` returns rows
   (data leak), defaults to `contains` (wrong operator), and needs list
   security. The check endpoint returns **only a boolean** and validates the
   field against an allowlist to prevent field-probing/enumeration.
4. **Client rule is field-level in vee-validate**, layered on top of the
   existing Zod `validationSchema` — we do **not** mutate the generated schema
   or push async refinements through `fromJSONSchema`.
5. **DB constraint is the real enforcer.** `unique: true` only *works* if the
   underlying column is actually `@unique` in Prisma. The framework consumes an
   existing Prisma model, so treat the constraint as a prerequisite the server
   layer detects and reports — and (optionally, later) have the Prisma
   generator emit `@unique` from the flag (ties into
   `CROUTON_PRISMA_GENERATOR_PLAN.md`).

## 3. Current state (map of what's involved)

| Concern | Location |
| --- | --- |
| Column schema (add `unique`) | `crouton-core/src/lib/resource/Column.ts` (`JsonColumnSchema`) |
| Field-input options passed to renderers | `crouton-core/.../FieldInput.schema.ts`, `fieldVariants.ts` |
| Form engine (vee-validate + Zod) | `crouton-forms-vue/src/forms/FormComponent.vue` (`useForm({ validationSchema })`) |
| Field binding (where a per-field rule attaches) | `crouton-forms-vue/.../composables/useControlBinding.ts` (`safeUseField`) |
| Input props / error display | `crouton-forms-vue/.../composables/useInput.ts` (`shouldShowError`, `errorMode`) |
| HTTP client injection | `crouton-forms-vue/src/composables/useHttpClient.ts` (`provideHttpClient`) |
| Repo client (uri base) | `crouton-forms-vue/src/repository/CrudRepository.ts` |
| Operation registration | `crouton-api/.../operations/register-endpoints.ts` → `registerEndpoint` |
| Filter → Prisma where | `crouton-api/.../read.repository.ts` (`buildFilterWhere`, `field:value:operator`) |
| Create/update writes (P2002 gap) | `crouton-api/.../write.repository.ts` (`create` = bare `prismaModel.create`) |
| Field-error channel the form already renders | `crouton-api/.../crouton-validation.error.ts` (`CroutonValidationError` → 400 `{field,message,code}`) |
| Resource config (allowlist source) | `crouton-api/.../resource-config.*` (columns w/ `unique`) |

Key existing facts we build on:

- Filter grammar is already `field:value:operator` with an `equals` operator
  and a jsonb path form — the check query can reuse `buildFilterWhere` or go
  direct to `findFirst`.
- `CroutonValidationError` already carries `{ field, message, code }[]` and is
  rendered by the form per-field — so a unique conflict just needs to be thrown
  in that shape to light up the right field.
- `update`/`patch` already `try/catch` Prisma errors; `create` does not — the
  P2002 handling wants to be centralized for all three.

## 4. Target architecture

### 4.1 Declaration (`crouton-core`)

Add to `JsonColumnSchema`:

```ts
/**
 * Enforce that this column's value is unique across the resource.
 * `true` → simple single-column uniqueness. Object form (future) allows
 * a composite scope, case-insensitive comparison, and a custom message.
 * Requires a matching DB unique constraint (@unique in Prisma) to be
 * actually enforceable — the flag alone does not create one.
 */
unique: z
  .union([
    z.boolean(),
    z.object({
      scope: z.array(z.string()).optional(),      // composite: unique per (field, ...scope)
      caseInsensitive: z.boolean().optional(),
      message: z.string().optional(),
    }),
  ])
  .optional(),
```

Normalize to an object internally (`{ enabled, scope, caseInsensitive, message }`)
in one helper so both API and Vue read the same shape. Ship Phase 1 handling
only the boolean/single-column path; parse-but-ignore `scope` until Phase 4.

`resource.schema.json` regenerates from the Zod source (existing
`gen-resource-schema.mjs` machinery) so editor validation picks up `unique`.

### 4.2 Server check endpoint (`crouton-api`)

New `operations/register-unique-check.ts`, wired into `registerEndpoint`
(alongside `registerFindAll` etc.):

```
GET /:route/unique?field=<col>&value=<v>&excludeId=<id?>
→ 200 { unique: boolean }
```

Behavior:

- **Allowlist `field`** against the resource's columns where `unique` is truthy.
  Unknown/non-unique field → `400` (prevents using this as a generic record
  probe / enumeration oracle).
- Query minimally:
  ```ts
  const row = await prismaModel.findFirst({
    where: {
      [field]: caseInsensitive ? { equals: value, mode: 'insensitive' } : value,
      ...(excludeId ? { NOT: { [idField]: coerceId(excludeId) } } : {}),
    },
    select: { [idField]: true },
  });
  return { unique: !row };
  ```
  `select` only the id — **never** return the matching row.
- `excludeId` lets **edit** mode ignore the record's own current value.
- Reuse the resource's read security (`ctx.secure(methodName, 'findAll')` or a
  dedicated `unique` action) so the endpoint respects the same auth as listing.
- Custom/non-Prisma adapters: gate behind `config.model` presence; if the
  adapter can't answer, the endpoint 404s and the client silently falls back to
  server-only enforcement (§4.4).
- Query params validated with a small Zod DTO (`field`, `value`, `excludeId?`)
  via the existing `ZodValidationPipe`.

### 4.3 Client async rule (`crouton-forms-vue`)

New composable `useUniqueValidator`:

```ts
// options.unique present on the control → attach a debounced async rule
const rule = useUniqueValidator({
  route,            // resource base uri (from repo/httpClient context)
  field,            // column id
  excludeId,        // edit mode: current record id
  message,          // custom or default "This <label> is already taken"
  http,             // injected client (useHttpClient)
});
```

Wiring point: `useControlBinding` / `safeUseField`. When
`uischema.options.unique` is set, register the field with a **field-level async
validator**:

```ts
useField(() => path, rule, { /* ... */ });
```

vee-validate merges a field's own rule with the form `validationSchema`, and
`useForm().validate()` **awaits** async field rules — so submit already blocks
until the check resolves; no change needed in `onSubmit`.

The rule itself:

1. **Skip** empty values (let `required` own that) and values equal to the
   field's initial value (edit mode, unchanged → no request).
2. **Debounce** ~400ms.
3. **Race-guard**: stamp each request with a token; ignore a response if a newer
   keystroke superseded it.
4. Call `GET /:route/unique`; return `true` if `unique`, else the message.
5. **Network/endpoint error → fail-open** (resolve `true`) with a console warn:
   the server still enforces on submit, so a flaky check must not block a
   legitimate save. (Decision point — see §7.)

Pending UX (`useInput.ts`): expose the field's `validating`/pending state so the
control can show a small "checking…" spinner and so `shouldShowError` doesn't
flash a stale error mid-check. `errorMode` stays as-is (`onBlur`/`onChange`);
the async error rides the same `errorMessage` channel the field already renders,
so `StringControlRenderer.vue` needs no structural change — only the binding
learns to attach the rule.

Threading the flag through: the loader/transformer that builds the ui-schema
options from a column must copy `column.unique` (normalized) onto
`fieldInput.options.unique` (+ `excludeId` supplied by the form context in edit
mode), the same way other column facts reach `options` today.

### 4.4 Server enforcement (the real guarantee) (`crouton-api`)

Centralize Prisma unique-conflict handling for **create/update/patch** in
`write.repository.ts` (create currently lacks a catch):

```ts
try {
  return await this.prismaModel.create({ data });
} catch (e) {
  throw mapPrismaWriteError(e, this.config); // P2002 → CroutonValidationError
}
```

`mapPrismaWriteError`:

- On Prisma `P2002`, read `e.meta.target` (the offending column(s)), map to the
  column id, and throw
  `new CroutonValidationError([{ field, message, code: 'unique' }])`.
- `message` = column's `unique.message` or a default. Resolve the column via the
  resource config so the field name matches what the form binds to.
- Rethrow anything else unchanged.

This makes the race-condition path (two concurrent creates passing the client
check) resolve to the **same** field error the client shows — one rendering
path, `CroutonValidationExceptionFilter` already turns it into a 400.

**Prerequisite:** the DB column must be `@unique`. If `unique: true` is declared
but no constraint exists, the check endpoint still works but the race guarantee
is gone. Add a dev-mode startup warning when a `unique` column has no detectable
unique index. (Optional, later: teach the Prisma generator —
`CROUTON_PRISMA_GENERATOR_PLAN.md` — to emit `@unique` from the flag so the
constraint and the declaration can't drift.)

## 5. Phased implementation

**Phase 1 — Declaration + server enforcement (correctness first)**
1. Add `unique` to `JsonColumnSchema` + a `normalizeUnique` helper in
   `crouton-core`; regenerate `resource.schema.json`.
2. `mapPrismaWriteError` + wrap `create`/`update`/`patch` in
   `write.repository.ts`; unit-test P2002 → `CroutonValidationError`.
3. Dev-mode warning when a `unique` column has no unique index.

**Phase 2 — Check endpoint**
4. `register-unique-check.ts` (allowlist, `findFirst`, id-only select,
   `excludeId`, security) wired into `registerEndpoint`; DTO + pipe.
5. Endpoint tests: hit/miss, `excludeId` self-exclusion, non-unique field
   rejected, no row data in response, custom-adapter fallthrough.

**Phase 3 — Client async validation**
6. `useUniqueValidator` (debounce, race token, skip-empty/unchanged,
   fail-open).
7. Thread `unique`/`excludeId` onto `fieldInput.options.unique` in the
   transformer; attach the rule in `useControlBinding`.
8. Pending state in `useInput.ts` + "checking…" affordance; verify submit
   awaits the async rule.
9. Component/e2e test: type existing value → error + submit blocked; type free
   value → clears; edit unchanged → no request.

**Phase 4 — Composite / polish**
10. Honor `unique.scope` (composite) client + endpoint + P2002 mapping.
11. `caseInsensitive` end-to-end. Docs page + example resource
    (`examples/…`) with a `unique` email column.

## 6. Backward compatibility

- Purely additive: `unique` is optional; existing resource.json files and
  generated schemas are unaffected (`CURRENT_RESOURCE_VERSION` unchanged).
- New endpoint is additive; the P2002 mapping only changes an error that was
  previously an unhandled 500 into a friendly 400 (strict improvement).
- Client rule is inert unless `options.unique` is set.

## 7. Risks & open questions

- **Fail-open vs fail-closed on check error.** Plan proposes fail-open (server
  still guards). Fail-closed gives louder feedback but blocks saves on a flaky
  network. Confirm.
- **Enumeration surface.** The endpoint confirms existence of a value. Mitigated
  by the field allowlist + existing resource auth, but for sensitive fields
  consider requiring auth / rate-limiting. Confirm per-field exposure is
  acceptable (email typically is, by design — "email already registered").
- **Debounce vs cost.** 400ms default; tune. Consider min-length gate before
  first request (don't probe on 1 char).
- **`fromJSONSchema` interaction.** Confirm vee-validate merges a field-level
  async rule with a `validationSchema`-provided field (it does in v4 via
  `useField(path, rules)` even when the form has a schema) — spike this first in
  Phase 3.
- **Composite uniqueness UX.** Which field shows the error, and re-validating
  the group when a scope field changes — deferred to Phase 4.
- **Prisma `P2002` target shape** varies by connector (column vs index name);
  the mapper needs a small lookup from constraint/target → column id.
```
