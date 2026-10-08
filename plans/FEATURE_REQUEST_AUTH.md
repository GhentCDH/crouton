# Feature Request: Per-operation authentication & role-based access control

**Package:** `crouton-api` / `crouton-core`

## Summary

Add the ability to protect individual CRUD operations behind authentication and/or role checks. The user is responsible for providing the auth guard — crouton only wires it up.

## Motivation

Currently all operations on a resource are either enabled or disabled. There's no way to make `findAll`/`findOne` public while requiring a logged-in user for `create`/`update`, or restricting `delete` to a specific role.

## Proposed API

**Typed config (`resource.ts`)**
```ts
definition: {
  findAll: true,
  findOne: true,
  create: true,
  update: { auth: true },       // any authenticated user
  delete: { roles: 'su' },      // only users with the 'su' role
}
```

**JSON config (`resource.json`)**
```json
"operations": {
  "findAll": true,
  "findOne": true,
  "create": true,
  "update": { "auth": true },
  "delete": { "roles": "su" }
}
```

**Module registration**
```ts
CroutonApiModule.forResources(configs, dataSources, loader, {
  baseUrl: '...',
  auth: { guard: MyAuthGuard },
})
```

**User-provided guard**
```ts
@Injectable()
export class MyAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(CROUTON_ROLES_KEY, ctx.getHandler())
    const user = ctx.switchToHttp().getRequest().user
    if (!user) return false
    if (!roles?.length) return true           // auth: true → any user
    return roles.some(r => user.roles.includes(r))
  }
}
```

## Behaviour

| Operation config | Guard applied | Roles metadata set |
|---|---|---|
| `true` | No | No |
| `{ auth: true }` | Yes | No |
| `{ roles: 'su' }` | Yes | `['su']` |
| `{ roles: ['su', 'admin'] }` | Yes | `['su', 'admin']` |
| `false` / omitted | Route not registered | — |

- `auth: true` means *any* authenticated user; the guard just checks that a user exists.
- `roles` implies auth — no need to set both.
- Crouton exports `CROUTON_ROLES_KEY` so guards can read the metadata without magic strings.
- No guard is bundled. Crouton stays framework-agnostic on auth strategy (JWT, session, API key, etc.).

## Out of scope

- Frontend route protection
- Per-field visibility by role
- Sub-resource auth (same pattern, follow-up issue)

## Implementation notes

See `AUTH_PLAN.md` for the full breakdown. Key changes:
- `crouton-core`: widen `JsonOperations` to accept auth objects
- `crouton-api`: widen `OperationDef`, add `authFor()` helper, thread `authGuard` through `OperationContext`, call `UseGuards` + `SetMetadata` per method in `register-crud.ts`
