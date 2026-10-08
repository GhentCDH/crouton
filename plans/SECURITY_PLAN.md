Status: planned
# Plan: feat/security — resource guards

Brand-new authorization layer for crouton. Each resource declares a
`security` block; crouton applies a **user-supplied NestJS guard** to the
matching routes. The guard receives the full `ExecutionContext`, so it can
read route params, query params, body and headers and decide itself.

Supersedes the older `auth`/`roles` design in `AUTH_PLAN.md`.

---

## Config surface (what the user writes)

`security` is either **global** (one block on the resource → applies to every
operation) or **per-operation** (a block inside each operation entry). A
per-operation block always wins over the global one.

```jsonc
// resource.json
{
  "security": { "guard": "admin" },        // GLOBAL default for every operation
  "operations": {
    "findAll": { "security": { "public": true } },  // override: this route is open
    "findOne": true,                                 // inherits global → guard "admin"
    "create":  { "security": { "guard": "editor" } },
    "update":  { "security": { "guard": ["editor", "admin"] } },
    "delete":  { "security": { "guard": "admin" } }
  }
}
```

```ts
// resource.ts (typed) — same shape
security: { guard: 'admin' },
definition: {
  findAll: { security: { public: true } },
  create:  { security: { guard: 'editor' } },
  delete:  { security: { guard: 'admin' } },
}
```

Rules:

- `{ public: true }` → no guard runs, even if a global guard is set.
- `{ guard: 'name' }` or `{ guard: ['a','b'] }` → named guard(s) must pass
  (all of them — AND).
- A guard **name** maps to a NestJS guard class registered once in the module
  (`CroutonApiModule.for...({ security: { guards: { admin: AdminGuard } } })`).
- **Precedence:** operation `security` → resource `security` (global) →
  module `security.default` → fully public.
- `status.json` is **always public** — the status controller never receives a
  guard (see Phase 7).

---

## Mechanism — one dispatching guard

Rather than sprinkling `@UseGuards(SomeClass)` per route, crouton uses **one**
`CroutonSecurityGuard` applied at the controller-class level. Per route it
reads crouton metadata (`crouton:security`, set at registration time) and:

1. `public` → return `true`.
2. otherwise resolve each named guard class from a registry, fetch the
   DI-managed instance via `ModuleRef`, and call its `canActivate(context)`
   with the **same ExecutionContext** — so the user's guard sees the real
   request (params/query/body/headers). All named guards must return truthy.

Why this shape:

- The user's guard is an ordinary NestJS guard with full DI (it can inject a
  token service, Prisma, etc.) — crouton adds no auth logic of its own.
- Named guards keep `resource.json` declarative and JSON-serializable (no
  class references in config).
- Routes with no metadata (status, app-layout) stay open by construction.

```
module: security.guards = { admin: AdminGuard, editor: EditorGuard }
                                   │
        ┌──────────────────────────┴───────────────────────────┐
        ▼                                                        ▼
SecurityGuardRegistry (name → class)              providers: [AdminGuard, EditorGuard]
        │                                                        │  (DI-managed)
        └────────────► CroutonSecurityGuard ◄────── ModuleRef ───┘
                         (class-level @UseGuards on every CRUD controller)
                         reads crouton:security metadata per handler
```

---

## Phases

### Phase 1 — Security schema (`crouton-core`)

**New file:** `packages/crouton-core/src/lib/data-source/Security.schema.ts`

```ts
import { z } from 'zod';

/** Public route, or one/more named guards that must all pass. */
export const SecuritySchema = z.union([
  z.object({ public: z.literal(true) }),
  z.object({ guard: z.union([z.string(), z.array(z.string()).min(1)]) }),
]);

export type SecurityConfig = z.infer<typeof SecuritySchema>;
```

**Edit:** `packages/crouton-core/src/lib/data-source/Operations.schema.ts`
Allow each operation to be a bool **or** an object carrying `security`
(and, for `upsert`, still `upsertOn`):

```ts
import { SecuritySchema } from './Security.schema';

const OpEntry = z.union([
  z.boolean(),
  z.object({ security: SecuritySchema.optional() }),
]);

const BoolOrUpsertSchema = z.union([
  z.boolean(),
  z.object({
    upsertOn: z.union([z.string(), z.array(z.string())]),
    security: SecuritySchema.optional(),
  }),
]);

export const JsonOperationsSchema = z.object({
  findAll: OpEntry.default(true),
  findOne: OpEntry.default(true),
  create:  OpEntry.default(true),
  update:  OpEntry.default(true),
  patch:   OpEntry.default(true),
  upsert:  BoolOrUpsertSchema.default(false),
  delete:  OpEntry.default(true),
});
```

**Edit:** `packages/crouton-core/src/lib/resource/ResourceJson.schema.ts`
Add the resource-level global block to `ResourceJsonShape`:

```ts
security: SecuritySchema.optional(),   // global default for all operations
```

**Codegen note:** `scripts/gen-resource-schema.mjs` runs
`z.toJSONSchema(ResourceJsonShape)` — regenerate the published JSON Schema so
editor autocomplete accepts `security`. Verify `isOperationEnabled` (which
tests `def[op] != null`) still treats `false` as disabled: an operation of
`{ security: {...} }` with no explicit `false` stays enabled — correct.

**Tests:** `Operations.schema.test.ts` — `{ public: true }`, `{ guard: 'x' }`,
`{ guard: ['a','b'] }`, plain `true`/`false`, and `upsert` keeping `upsertOn`.

```sh
git commit -m "feat(crouton-core): add security schema to resource operations"
```

---

### Phase 2 — Typed resource definition (`crouton-api`)

**Edit:** `packages/crouton-api/src/lib/crud/resource/defintion.schema.ts`
Widen `OperationDefSchema` and add resource-level security:

```ts
import { SecuritySchema } from '@ghentcdh/crouton-core';

const OperationDefSchema = z.union([
  z.literal(true),
  z.object({
    schema: SchemaInputSchema.optional(),
    security: SecuritySchema.optional(),
  }),
]);
// UpsertOperationDefSchema: add `security: SecuritySchema.optional()`
```

**Edit:** `packages/crouton-api/src/lib/crud/resource/ResourceConfig.schema.ts`
Add `security: SecuritySchema.optional()` to `ResourceSchema`.

```sh
git commit -m "feat(crouton-api): thread security through resource definition types"
```

---

### Phase 3 — Resolver helper (`crud.config.ts`)

**Edit:** `packages/crouton-api/src/lib/crud/crud.config.ts`

```ts
import type { SecurityConfig } from '@ghentcdh/crouton-core';

/** Effective security for one operation: op-level → resource global → module default. */
export const securityFor = (
  config: Resource,
  def: ResourceDefinition,
  op: CrudOperation,
  moduleDefault?: SecurityConfig,
): SecurityConfig | undefined => {
  const entry = def[op];
  const opSec =
    entry && entry !== true ? (entry as { security?: SecurityConfig }).security : undefined;
  return opSec ?? config.security ?? moduleDefault;
};
```

`securityFor` for sub-resources reads `sub.operations[op].security ?? config.security ?? moduleDefault` (same precedence; a sub-resource inherits the parent resource's global block).

**Tests:** `crud.config.test.ts` covering the full precedence ladder incl.
`public` overriding a global guard.

```sh
git commit -m "feat(crouton-api): add securityFor precedence resolver"
```

---

### Phase 4 — Guard registry + dispatching guard

**New file:** `packages/crouton-api/src/lib/crud/security/security-guard.registry.ts`

```ts
import { Injectable, type CanActivate, type Type } from '@nestjs/common';

@Injectable()
export class SecurityGuardRegistry {
  constructor(private readonly guards: Record<string, Type<CanActivate>> = {}) {}
  resolve(name: string): Type<CanActivate> {
    const g = this.guards[name];
    if (!g) throw new Error(`Unknown security guard "${name}". Register it in security.guards.`);
    return g;
  }
  classes(): Type<CanActivate>[] { return Object.values(this.guards); }
}
```

**New file:** `packages/crouton-api/src/lib/crud/security/crouton-security.guard.ts`

```ts
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import type { SecurityConfig } from '@ghentcdh/crouton-core';
import { SecurityGuardRegistry } from './security-guard.registry';

export const CROUTON_SECURITY = 'crouton:security';

@Injectable()
export class CroutonSecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: SecurityGuardRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const sec = this.reflector.get<SecurityConfig | undefined>(
      CROUTON_SECURITY,
      context.getHandler(),
    );
    if (!sec || 'public' in sec) return true;            // no rule / explicitly public
    const names = Array.isArray(sec.guard) ? sec.guard : [sec.guard];
    for (const name of names) {
      const cls = this.registry.resolve(name);
      const guard = this.moduleRef.get(cls, { strict: false }); // DI-managed instance
      const ok = await guard.canActivate(context);             // same ExecutionContext
      if (!ok) return false;
    }
    return true;
  }
}
```

**New file:** `packages/crouton-api/src/lib/crud/security/index.ts` — re-export
`CROUTON_SECURITY`, `CroutonSecurityGuard`, `SecurityGuardRegistry`.

> Note: user guards resolved via `moduleRef.get(cls, { strict: false })` must
> be registered as providers (Phase 6) so DI can construct them with their own
> dependencies. `strict:false` lets the guard live in a different module.

```sh
git commit -m "feat(crouton-api): add security guard registry and dispatch guard"
```

---

### Phase 5 — Tag routes with security metadata

Add a one-line collector to `OperationContext` and call it wherever a route
method is defined. Keeping the operation key explicit (not inferred from the
method name) avoids fragile name-parsing for child/action routes.

**Edit:** `packages/crouton-api/src/lib/crud/operations/operation-context.ts`
Add to `OperationContext`:

```ts
/** Resource-level global security + module default, precomputed in the factory. */
resourceSecurity?: SecurityConfig;
moduleDefaultSecurity?: SecurityConfig;
/** Tag a just-defined handler with its effective security (called by register-*). */
secure: (methodName: string, op: CrudOperation, sub?: SubResourceConfig) => void;
```

**Edit:** `packages/crouton-api/src/lib/crud/crud-controller.factory.ts`
Build `ctx.secure` before `registerEndpoints(ctx)`:

```ts
import { SetMetadata } from '@nestjs/common';
import { CROUTON_SECURITY } from './security';
import { securityFor } from './crud.config';

ctx.secure = (methodName, op, sub) => {
  const sec = sub
    ? (sub.operations as any)[op]?.security ?? config.security ?? ctx.moduleDefaultSecurity
    : securityFor(config, definition, op, ctx.moduleDefaultSecurity);
  if (sec) SetMetadata(CROUTON_SECURITY, sec)(ctx.cls.prototype, methodName,
    Object.getOwnPropertyDescriptor(ctx.cls.prototype, methodName)!);
};
```

**Edit each register-*.ts** — one call right after the method is defined
(`def(cls, methodName, ...)`), passing the operation key:

| file | method(s) | op key |
|------|-----------|--------|
| `register-findall.ts`  | `findAll` / `findAllBy_<r>`     | `findAll` |
| `register-findone.ts`  | `findOne` / `findOneChild_<r>`  | `findOne` |
| `register-create.ts`   | `create` / `createChild_<r>`    | `create`  |
| `register-update.ts`   | `update` / `updateChild_<r>`    | `update`  |
| `register-patch.ts`    | `patch` / `patchChild_<r>`      | `patch`   |
| `register-delete.ts`   | `delete` / `deleteChild_<r>`    | `delete`  |

Example (register-delete.ts, after `def(cls, methodName, properties.deleteFn)`):

```ts
ctx.secure(methodName, 'delete', sub);
```

**Decision — schema/definition/action routes:** `getSchemas`, the
`resource.json`/columns/definition endpoints, and `procedure_*` / `tableAction_*`
actions. Recommended: schema + definition endpoints follow the **resource
global** security (so a fully-guarded resource does not leak its form shape),
and procedure/table actions follow the resource global too (they mutate data).
Wire `ctx.secure` into `register-schemas.ts`, `register-schema-endpoints.ts`
and `register-actions.ts` with a synthetic op that resolves to
`config.security ?? moduleDefault`. If we want schemas public regardless, skip
tagging them — flag for Bo to confirm.

```sh
git commit -m "feat(crouton-api): tag crud routes with resolved security metadata"
```

---

### Phase 6 — Module wiring (`crouton-api.module.ts`)

**Edit:** `packages/crouton-api/src/lib/crouton-api.module.ts`

Extend `CroutonAppConfig`:

```ts
import type { Type, CanActivate } from '@nestjs/common';
import type { SecurityConfig } from '@ghentcdh/crouton-core';

type CroutonAppConfig = {
  baseUrl: string;
  security?: {
    guards: Record<string, Type<CanActivate>>;   // name → guard class
    default?: SecurityConfig;                      // applied when nothing else specified
  };
};
```

In `forResources`:

- Build `const guardRegistry = new SecurityGuardRegistry(appConfig.security?.guards ?? {});`
- Pass `appConfig.security?.default` into `createCrudController(c, baseUrl, moduleDefault)`
  → set `ctx.moduleDefaultSecurity`.
- Apply the class-level guard to every CRUD controller **only** (not status,
  not app-layout). Cleanest: `@UseGuards(CroutonSecurityGuard)` on
  `CrudControllerBase` inside the factory (add `UseGuards(CroutonSecurityGuard)(CrudControllerBase)`
  next to the existing `Controller(...)` / `ApiTags(...)` calls).
- Providers: register the guard machinery and the user guard classes so DI can
  build them:

```ts
providers: [
  { provide: APP_FILTER, useClass: CroutonValidationExceptionFilter },
  { provide: DataSourceRegistry, useValue: dataSourceRegistry },
  { provide: ResourceConfigRegistry, useValue: configRegistry },
  { provide: SecurityGuardRegistry, useValue: guardRegistry },
  CroutonSecurityGuard,
  ...guardRegistry.classes(),   // user guards, DI-managed
  ...(translationRegistry ? [ ... ] : []),
],
```

Thread `appConfig.security` through `forResourceDir` / `forLoader` (both
currently destructure only `{ baseUrl }` — widen to pass `security`).

```sh
git commit -m "feat(crouton-api): register security guards and apply dispatch guard to crud controllers"
```

---

### Phase 7 — Keep status.json public (verify)

`createStatusController` builds its own `@Controller('crouton')` and is added
to `controllers` directly — it never passes through `createCrudController`, so
it gets **no** `CroutonSecurityGuard`. No change needed; add a regression test
asserting `GET /crouton/status.json` returns 200 with no guard metadata even
when a global guard and module default are configured.

**Decision:** `_app/layout` (app-layout controller) is likewise unguarded
today. The UI needs it to bootstrap — recommend leaving it public, or gating
it behind an authenticated-only guard if the sidebar itself is sensitive.
Confirm with Bo.

```sh
git commit -m "test(crouton-api): assert status.json stays public under global security"
```

---

### Phase 8 — Integration test + docs

- **e2e-style test** in `crouton-api`: a resource with global `{ guard: 'admin' }`,
  `findAll` overridden to `{ public: true }`, using a fake `AdminGuard` that
  reads `req.headers['x-role']`. Assert: `findAll` open; `create`/`delete`
  401/403 without header, 200 with; `status.json` always 200. Assert the guard
  actually receives params/query (e.g. denies when `?tenant=` mismatches).
- **Docs:** add a "Security" page under `docs/` — config shape, precedence
  table, how to write and register a guard, the always-public status route.
- Regenerate the resource JSON Schema (`scripts/gen-resource-schema.mjs`) and
  commit the artifact.

```sh
git commit -m "test(crouton-api): security guard integration coverage"
```

```sh
git commit -m "docs: document resource security guards and precedence"
```

---

## Open decisions for Bo

1. **Default when nothing is set** — fully public (backwards-compatible, my
   recommendation) vs. deny-by-default requiring an explicit `public: true`.
2. **Schema / definition / action routes** — follow the resource's global
   security, or always public? (Phase 5.)
3. **`_app/layout`** — leave public or guard it? (Phase 7.)
4. **Guard combination** — multiple named guards as **AND** (my default) vs.
   OR. Single name covers most cases.
