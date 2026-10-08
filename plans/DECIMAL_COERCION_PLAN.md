Status: planned
# Decimal Coercion Plan

Coerce inbound `number` / `string` values into `Prisma.Decimal` centrally, so
apps never have to hand-edit generated `schema.ts` files for Decimal columns.

## Problem

Zod-Prisma emits `z.instanceof(Prisma.Decimal)` for every Decimal column. Incoming
JSON request bodies carry a plain `number` (or a numeric `string` from a form), which
fails the `instanceof` check and produces `invalid_type` on the field (e.g. `amount`).

The current workaround lives in each app schema, hand-written per resource:

```ts
export default balance_entriesWithRelationsSchema.extend({
  amount: z
    .union([z.instanceof(Prisma.Decimal), z.number(), z.string()])
    .transform((v) => new Prisma.Decimal(v)),
});
```

This does not scale — every app, and every Decimal field within it, needs the same
edit, and each edit is lost/re-created whenever the schema is regenerated.

## Goal

One fix inside crouton that makes Decimal fields accept `number` / `string` / `Decimal`
on write, symmetric with the outbound handling we already have:

- `#121` — `Decimal.prototype.toJSON` patched so responses emit `amount: 80`, not `"80"`.
- `json-schema.opts.ts` — Decimal mapped to `{ type: "number" }` so forms render a number input.

The write path is the missing third side of that triangle.

## Approach

Coerce in `ZodValidationPipe` (`packages/crouton-api/src/lib/crud/zod-validation.pipe.ts`),
just before `schema.safeParse(input)`. This pipe is the single choke point for every
create / update / upsert / patch body, and it already does the same kind of top-level
preprocessing (`stripEmptyStrings`, `coerceNullable`) driven by keys computed from
`schema.shape` in the constructor. Decimal coercion is the same shape of operation:
detect the Decimal top-level fields once, coerce their values on each request.

### Why the pipe, and not the alternatives

- **Per-schema `.extend()`** (current) — exactly what we are eliminating.
- **Codegen** (emit the coercion into the generated `schema.ts`) — the generated types
  come from zod-prisma-types, which we do not own; the coercion would have to be
  re-injected on every `prisma generate`, in every app, and kept in sync with the two
  existing outbound fixes. More surface, more drift.
- **Pipe** — one file, all apps, consistent with the coercions already there, and
  crouton-api may reach the Prisma runtime (crouton-core stays browser-safe).

## Steps

1. **Expose a Decimal detector from crouton-core.** `isInstanceOf(schema, 'Decimal')`
   is currently private in `packages/crouton-core/src/lib/view/json-schema.opts.ts`.
   Extract an `isDecimalField(zodType)` that unwraps `optional | nullable | default |
   readonly` first (reuse the `unwrap` logic that already exists in
   `crouton-api/.../schema.utils.ts` — consider lifting it to core to stop the
   duplication) and then applies the existing name-based check. Export it from
   `packages/crouton-core/src/lib/view/index.ts`.

2. **Compute `decimalKeys` in the pipe constructor**, mirroring `nullableKeys`:
   the top-level fields of `schema.shape` whose unwrapped type is a Decimal instanceof.

3. **Add a `coerceDecimals(value)` step** in `transform()`, run before `safeParse`
   (after `stripEmptyStrings` / `coerceNullable`, so `null` / `undefined` are already
   settled). For each `decimalKey` present in the body with a `number` / `string` /
   Decimal-like value, replace it with `new Decimal(v)`. Leave `null` / `undefined`
   untouched, and skip keys not present (so PATCH semantics — omitted means unchanged —
   are preserved).

4. **Resolve the `Decimal` constructor** — the one real design decision here. The
   detector is name-based and deliberately cannot recover the class (the comment in
   `json-schema.opts.ts` notes the class ref is closure-captured and unreachable), so the
   constructor must be imported. `transform()` is synchronous, so prefer resolving the
   ctor **once at pipe-module load** via a guarded `require('@prisma/client/runtime/library').Decimal`
   (CJS, requireable) inside try/catch. If it can't be resolved, skip coercion entirely —
   behaviour falls back to today's. This mirrors the dynamic-import + graceful-fallback
   pattern from `#121` (`crouton-api.module.ts`), kept sync because the pipe is sync.
   > Open question to confirm before implementing: which module path exposes `Decimal`
   > for the client versions the template pins (`@prisma/client/runtime/library` vs
   > `.../client`). `#121` used `.../client` via dynamic import — align with that.

5. **Edge cases.**
   - Invalid numeric string → let `new Decimal()` throw, catch it, and leave the raw
     value in place so Zod emits the correct validation error instead of a 500.
   - Decimal nested inside relations / arrays → out of scope for v1 (top-level only,
     matching how `nullableKeys` works today). Note it as a known limitation.

6. **Tests** — `zod-validation.pipe.spec.ts` (new): `number` → Decimal, numeric `string`
   → Decimal, existing `Decimal` passthrough, `null` / `undefined` passthrough, invalid
   string → validation error (not a throw), non-Decimal fields untouched, PATCH with the
   field omitted stays omitted.

7. **Release note** — add a `fix(api)` entry to `RELEASE_NOTES.md` and bump the alpha
   version as usual.

## Follow-up (separate, in the app repo — not crouton)

Once the crouton fix ships and the app bumps to it, delete the per-schema workaround in
`parrothome` (`balance/balance_entries/schema.ts`, `balance/balance_recurring/schema.ts`)
so those files go back to a plain `export default …WithRelationsSchema;`.

## Files to touch (crouton)

- `packages/crouton-core/src/lib/view/json-schema.opts.ts` — extract/export `isDecimalField`
- `packages/crouton-core/src/lib/view/index.ts` — re-export it
- `packages/crouton-api/src/lib/crud/zod-validation.pipe.ts` — `decimalKeys` + `coerceDecimals` + ctor resolution
- `packages/crouton-api/src/lib/crud/zod-validation.pipe.spec.ts` — new tests
- `RELEASE_NOTES.md` — changelog entry

---

## Commit message (copy-paste)

```
fix(api): coerce inbound number/string to Prisma.Decimal in ZodValidationPipe

Zod-Prisma emits z.instanceof(Prisma.Decimal) for Decimal columns, so a JSON
body carrying a plain number (or a numeric string from a form) fails validation
with invalid_type on the field. Apps were working around this by hand-extending
each generated schema with a coercing union — one edit per resource per field,
lost on regenerate.

Coerce centrally in ZodValidationPipe instead: detect Decimal top-level fields
once (isDecimalField, exported from crouton-core) and wrap number/string values
in Prisma.Decimal before safeParse. Null/undefined and omitted keys are left
untouched (PATCH-safe); an invalid numeric string is left in place so Zod emits
a proper validation error. The Decimal constructor is resolved once at module
load with a guarded require and skipped on failure — same graceful-fallback
pattern as the Decimal.toJSON patch (#121).

This is the write-path counterpart to the existing Decimal handling:
Decimal.toJSON → number in responses (#121) and Decimal → type:"number" in the
generated JSON schema.
```
