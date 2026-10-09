Status: planned
# Plan: feat/authentication

Add per-operation authentication and role-based access control to crouton.
The user owns the auth provider; crouton wires up guards and metadata.

## Goal

```ts
// resource.ts (typed)
definition: {
  findAll: true,
  findOne: true,
  create: true,
  update: { auth: true },          // any authenticated user
  delete: { roles: 'su' },         // only users with the 'su' role
}

// resource.json (JSON-file config)
"operations": {
  "findAll": true,
  "findOne": true,
  "create": true,
  "update": { "auth": true },
  "delete": { "roles": "su" }
}
```

---

## Architecture

Crouton applies a user-supplied NestJS `CanActivate` guard and `SetMetadata`
decorators **per method** when an operation carries `auth` or `roles`.
The guard is responsible for reading roles from the reflector — crouton only
sets the metadata key `"crouton:roles"`.

```
CroutonConfig.auth.guard  ──────────────────────────────────────────────┐
                                                                         │
resource.json / ResourceDefinition                                       │
  operations.update = { auth: true }   → UseGuards(guard)               │
  operations.delete = { roles: 'su' }  → UseGuards(guard)               │
                                          SetMetadata('crouton:roles',['su'])
```

No guard class is bundled with crouton. Users write one guard and register
it in `CroutonApiModule.forResources({ auth: { guard: MyAuthGuard } })`.

---

## Phases

### Phase 1 — Zod schema for auth operations (`crouton-core`)

**File:** `packages/crouton-core/src/lib/data-source/Operations.schema.ts`

Extend the existing `JsonOperationsSchema` to accept auth objects alongside booleans:

```ts
const JsonAuthConfigSchema = z.union([
  z.object({ auth: z.literal(true), roles: z.undefined().optional() }),
  z.object({ roles: z.union([z.string(), z.array(z.string())]), auth: z.undefined().optional() }),
]);

/** An operation entry: enabled (true), disabled (false), or enabled+auth. */
const JsonOperationDefSchema = z.union([z.boolean(), JsonAuthConfigSchema]);

const BoolOrUpsertSchema = z.union([
  z.boolean(),
  z.object({ upsertOn: z.union([z.string(), z.array(z.string())]) }),
  JsonAuthConfigSchema.and(z.object({ upsertOn: z.union([z.string(), z.array(z.string())]).optional() })),
]);

export const JsonOperationsSchema = z.object({
  findAll: JsonOperationDefSchema.default(true),
  findOne: JsonOperationDefSchema.default(true),
  create:  JsonOperationDefSchema.default(true),
  update:  JsonOperationDefSchema.default(true),
  upsert:  BoolOrUpsertSchema.default(false),
  delete:  JsonOperationDefSchema.default(true),
});
```

Export `JsonAuthConfigSchema` and inferred types.

**Tests:** Unit tests in `Operations.schema.test.ts` validating:
- `{ auth: true }` parses correctly
- `{ roles: 'su' }` parses correctly
- `{ roles: ['admin', 'su'] }` parses correctly
- `true` / `false` still work

```sh
git commit -m "feat(crouton-core): add auth config to operations schema"
```

---

### Phase 2 — Runtime operation types (`crouton-api`)

**Files:**
- `packages/crouton-api/src/lib/crud/resource/defintion.schema.ts`
- `packages/crouton-api/src/lib/crud/crud.config.ts`

Widen `OperationDefSchema` to include auth fields:

```ts
// defintion.schema.ts
const OperationDefSchema = z.union([
  z.literal(true),
  z.object({
    schema: SchemaInputSchema.optional(),
    auth: z.literal(true).optional(),
    roles: z.union([z.string(), z.array(z.string())]).optional(),
  }),
]);
```

Add helper in `crud.config.ts`:

```ts
export type OperationAuth = {
  auth?: true;
  roles?: string | string[];
};

export const authFor = (
  def: ResourceDefinition,
  op: CrudOperation,
): OperationAuth | undefined => {
  const entry = def[op];
  if (!entry || entry === true) return undefined;
  const { auth, roles } = entry as OperationAuth;
  return auth || roles ? { auth, roles } : undefined;
};
```

```sh
git commit -m "feat(crouton-api): widen OperationDef for auth metadata"
```

---

### Phase 3 — Module config (`crouton-api.module.ts`)

**File:** `packages/crouton-api/src/lib/crouton-api.module.ts`

Add `auth` to `CroutonAppConfig`:

```ts
import type { Type, CanActivate } from '@nestjs/common';

type CroutonAppConfig = {
  baseUrl: string;
  auth?: {
    guard: Type<CanActivate>;
  };
};
```

Pass guard through `forResources` → `createCrudController`:

```ts
...configs.map((c) => createCrudController(c, baseUrl, appConfig.auth?.guard)),
```

```sh
git commit -m "feat(crouton-api): accept auth guard in module config"
```

---

### Phase 4 — Operation context

**File:** `packages/crouton-api/src/lib/crud/operations/operation-context.ts`

Add `authGuard` field:

```ts
import type { Type, CanActivate } from '@nestjs/common';

export type OperationContext = {
  // ... existing fields ...
  authGuard?: Type<CanActivate>;
};
```

```sh
git commit -m "feat(crouton-api): add authGuard to OperationContext"
```

---

### Phase 5 — Apply guards in register-crud.ts

**File:** `packages/crouton-api/src/lib/crud/operations/register-crud.ts`

Add auth application helper and call it in each register function:

```ts
import { SetMetadata, UseGuards } from '@nestjs/common';
import { authFor } from '../crud.config';

export const CROUTON_ROLES_KEY = 'crouton:roles';

const applyAuth = (
  ctx: OperationContext,
  op: CrudOperation,
  target: object,
  methodName: string,
  descriptor: PropertyDescriptor,
): void => {
  if (!ctx.authGuard) return;
  const auth = authFor(ctx.definition, op);
  if (!auth) return;

  UseGuards(ctx.authGuard)(target, methodName, descriptor);

  if (auth.roles) {
    const roles = Array.isArray(auth.roles) ? auth.roles : [auth.roles];
    SetMetadata(CROUTON_ROLES_KEY, roles)(target, methodName, descriptor);
  }
};
```

Call `applyAuth(ctx, '<op>', cls.prototype, '<method>', d)` at the end of each
`registerFindAll`, `registerFindOne`, `registerCreate`, `registerUpdate`,
`registerDelete`, `registerUpsert`.

**Tests:** Unit tests verifying:
- Guard decorator applied when `auth: true`
- `SetMetadata` applied when `roles` present
- No decorators when operation is plain `true`
- No decorators when no `authGuard` in context

```sh
git commit -m "feat(crouton-api): apply auth guards per operation"
```

---

### Phase 6 — JSON adapter auth forwarding

**Files:**
- `packages/crouton-api/src/lib/crud/builder/schema.helpers.ts`
- `packages/crouton-api/src/lib/crud/adapter/json-adapter.ts`

Widen `opWithSchema` to forward auth from JSON operation defs:

```ts
// schema.helpers.ts
const extractAuth = (entry: unknown): { auth?: true; roles?: string | string[] } => {
  if (!entry || typeof entry === 'boolean') return {};
  const { auth, roles } = entry as { auth?: true; roles?: string | string[] };
  return { ...(auth && { auth }), ...(roles && { roles }) };
};

export const opWithSchema = (
  enabled: unknown,
  schema: SchemaInput | undefined,
): OperationDef | undefined => {
  if (enabled === false) return undefined;
  const auth = extractAuth(enabled);
  const hasAuth = auth.auth || auth.roles;
  if (!schema && !hasAuth) return true;
  return { ...(schema && { schema }), ...auth };
};
```

Fix `delete` in `json-adapter.ts` to use `opWithSchema` instead of hardcoded `true`:

```ts
// Before
...(json.operations.delete !== false && { delete: true }),

// After
...(opWithSchema(json.operations.delete ?? true, undefined) && {
  delete: opWithSchema(json.operations.delete ?? true, undefined)!,
}),
```

Also update `upsertOp` to forward auth.

```sh
git commit -m "feat(crouton-api): forward auth config through JSON adapter"
```

---

### Phase 7 — Controller factory wiring

**File:** `packages/crouton-api/src/lib/crud/crud-controller.factory.ts`

Accept `authGuard` parameter and inject into context:

```ts
import type { Type, CanActivate } from '@nestjs/common';

export function createCrudController(
  config: Resource,
  baseUrl?: string,
  authGuard?: Type<CanActivate>,
): Type<any> {
  // ...
  const ctx: OperationContext = {
    // ... existing fields ...
    authGuard,
  };
  // ...
}
```

```sh
git commit -m "feat(crouton-api): pass authGuard through controller factory"
```

---

### Phase 8 — Export public surface + tests

**File:** `packages/crouton-api/src/index.ts`

```ts
export { CROUTON_ROLES_KEY } from './lib/crud/operations/register-crud';
```

**Integration test:** End-to-end test with a mock guard verifying:
- Unauthenticated request to `{ auth: true }` endpoint returns 403
- Authenticated request without required role returns 403
- Authenticated request with correct role returns 200
- Public endpoints remain accessible

```sh
git commit -m "feat(crouton-api): export CROUTON_ROLES_KEY and add integration tests"
```

---

## User-side usage

```ts
// my-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CROUTON_ROLES_KEY } from '@ghentcdh/crouton-api';

@Injectable()
export class MyAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(CROUTON_ROLES_KEY, ctx.getHandler());
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;  // populated by your JWT/session middleware

    if (!user) return false;
    if (!roles?.length) return true;           // auth:true, any user is fine
    return roles.some(r => user.roles.includes(r));
  }
}

// app.module.ts
CroutonApiModule.forResources(configs, dataSources, loader, {
  baseUrl: '...',
  auth: { guard: MyAuthGuard },
});
```

---

## Files changed

| Package | File | Change |
|---|---|---|
| `crouton-core` | `data-source/Operations.schema.ts` | Add `JsonAuthConfigSchema`, widen operation defs to accept auth objects |
| `crouton-api` | `resource/defintion.schema.ts` | Widen `OperationDefSchema` with auth + roles fields |
| `crouton-api` | `crud.config.ts` | Add `OperationAuth` type, add `authFor()` helper |
| `crouton-api` | `crouton-api.module.ts` | Add `auth.guard` to `CroutonAppConfig`, pass to factory |
| `crouton-api` | `operations/operation-context.ts` | Add `authGuard?` field |
| `crouton-api` | `operations/register-crud.ts` | Add `CROUTON_ROLES_KEY`, `applyAuth()`, call in each `registerXxx` |
| `crouton-api` | `crud-controller.factory.ts` | Accept `authGuard` param, inject into `OperationContext` |
| `crouton-api` | `builder/schema.helpers.ts` | Forward auth from JSON def in `opWithSchema` / `upsertOp` |
| `crouton-api` | `adapter/json-adapter.ts` | Fix `delete` to use `opWithSchema` (so auth flows through) |
| `crouton-api` | `index.ts` | Export `CROUTON_ROLES_KEY` |

---

## Out of scope

- Bundling a JWT/session guard — the user provides it
- Frontend route protection — a separate concern
- Per-field visibility based on roles
- Sub-resource auth (follow-up, same pattern applies to `register-sub-resources.ts`)