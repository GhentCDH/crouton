# Security

Crouton supports declarative, per-resource authorization through **named
NestJS guards**. You write the guard once, register it by name, and reference
it from `resource.json` or the typed resource config.

## Config shape

### Resource-level (global)

Applies to every operation on the resource unless overridden:

```json
{
  "security": { "guard": "admin" },
  "operations": { ... }
}
```

### Per-operation

Override the global block for a single operation:

```json
{
  "security": { "guard": "admin" },
  "operations": {
    "findAll": { "security": { "public": true } },
    "findOne": true,
    "create":  { "security": { "guard": "editor" } },
    "update":  { "security": { "guard": ["editor", "admin"] } },
    "delete":  { "security": { "guard": "admin" } }
  }
}
```

### Typed resource config (`.ts`)

Same shape in TypeScript:

```ts
import { defineResource } from '@ghentcdh/crouton-api';

export default defineResource({
  // ...
  security: { guard: 'admin' },
  definition: {
    findAll: { security: { public: true } },
    create:  { security: { guard: 'editor' } },
  },
});
```

## Options

| Shape | Meaning |
|-------|---------|
| `{ public: true }` | No guard runs — route is open, even if a global guard is set |
| `{ guard: 'name' }` | Named guard must pass |
| `{ guard: ['a', 'b'] }` | All named guards must pass (AND) |

## Precedence

Security is resolved per-operation in this order:

1. **Operation-level** `security` (inside `operations.<op>`)
2. **Resource-level** `security` (top-level on the resource)
3. **Module default** (`security.default` on `CroutonAppConfig`)
4. **Fully public** (no guard configured anywhere)

The first match wins. A per-operation `{ public: true }` overrides a
resource-global guard.

## Writing a guard

A guard is a standard NestJS `CanActivate` guard. Crouton passes the same
`ExecutionContext`, so your guard has full access to the request (params,
query, body, headers):

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  // Inject any service you need (token service, Prisma, etc.)
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization'];
    return this.authService.isAdmin(token);
  }
}
```

## Registering guards

Pass guard classes to `CroutonApiModule` via the `security` config:

```ts
import { CroutonApiModule } from '@ghentcdh/crouton-api';
import { AdminGuard } from './guards/admin.guard';
import { EditorGuard } from './guards/editor.guard';

@Module({
  imports: [
    CroutonApiModule.forResourceDir(resourcesDir, dataSourcesDir, {
      baseUrl: 'http://localhost:3000',
      security: {
        guards: {
          admin: AdminGuard,
          editor: EditorGuard,
        },
        // Optional: applied when no resource or operation declares security
        default: { guard: 'admin' },
      },
    }),
  ],
})
export class AppModule {}
```

Guard classes are registered as NestJS providers automatically, so they can
inject any service available in the module (Prisma, token services, config,
etc.).

## How it works

Crouton uses a **single dispatching guard** (`CroutonSecurityGuard`) applied
at the controller class level on every CRUD controller. For each request it:

1. Reads `crouton:security` metadata from the route handler.
2. If absent or `{ public: true }` → allows the request.
3. Otherwise resolves each named guard class from the registry, fetches the
   DI-managed instance, and calls `canActivate(context)`.
4. All named guards must return `true` (AND semantics).

```
module config
  └─ security.guards = { admin: AdminGuard, editor: EditorGuard }
       │
       ├─ SecurityGuardRegistry (name → class)
       │
       └─ providers: [AdminGuard, EditorGuard]  (DI-managed)
              │
              ▼
     CroutonSecurityGuard (class-level @UseGuards on every CRUD controller)
       reads crouton:security metadata per handler
       delegates to named guards via ModuleRef
```

## Always-public routes

These routes never receive a guard, regardless of configuration:

- `GET /crouton/status.json` — system health check
- `GET /_app/layout` — frontend bootstrap data

## Schema and definition endpoints

The `GET /schemas`, `GET /definition`, and `GET /resource.json` endpoints
follow the **resource-level** global security. If the resource declares
`{ guard: 'admin' }`, these endpoints require the admin guard too. This
prevents leaking form shapes for guarded resources.

## Multiple guards

When `guard` is an array, all guards must pass (AND semantics):

```json
{ "security": { "guard": ["authenticated", "admin"] } }
```

Both `authenticated` and `admin` guards must return `true` for the request to
proceed. If any guard rejects, the request is denied.
