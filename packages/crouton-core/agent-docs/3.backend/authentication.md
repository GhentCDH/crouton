# Authentication

Crouton auth is declared in `auth-providers/` (configured via `authProvidersDir` in `crouton.json`). Auth is disabled when the folder is absent — existing apps without it are unaffected.

## Quick start

```json
// crouton.json
{ "authProvidersDir": "src/app/auth-providers" }
```

Add a folder per provider, each with `auth-provider.json`:

```
src/app/auth-providers/
  keycloak/
    auth-provider.json
```

## Providers

| Provider | Required env vars | Notes |
|---|---|---|
| `keycloak` | `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID` | OIDC via `${url}/realms/${realm}` |
| `auth0` | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE` | OIDC |
| `google` | `GOOGLE_CLIENT_ID` | Email-based roles via `roles.byEmail` |
| `oidc` | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE` | Generic OIDC |
| `dev` | `CROUTON_DEV_TOKEN` | Static bearer token — **refuses to start in production** |
| `custom` | — | `index.ts` default-exports `defineAuthProvider(...)` |

Env vars listed above are the defaults. Override with the `env` field in `auth-provider.json`.

## Example: Keycloak

```jsonc
// auth-providers/keycloak/auth-provider.json
{
  "name": "keycloak",
  "provider": "keycloak",
  "default": true,
  "guards": {
    "admin":  ["admin"],
    "editor": { "anyOf": ["editor", "admin"] }
  },
  "defaultSecurity": { "guard": "authenticated" }
}
```

```dotenv
# .env
KEYCLOAK_URL=https://auth.example.org
KEYCLOAK_REALM=crouton
KEYCLOAK_CLIENT_ID=crouton-admin
```

## Role guards

Guards defined in `auth-provider.json` are usable in any `resource.json`:

```jsonc
// resource.json
{ "security": { "guard": "admin" } }
```

Array shorthand = `anyOf`. `allOf` requires every role:

```jsonc
{ "guards": {
  "admin":     ["admin"],
  "editor":    { "anyOf": ["editor", "admin"] },
  "publisher": { "allOf": ["editor", "reviewer"] }
} }
```

`authenticated` is a built-in guard (any authenticated user).

## Frontend

`useAuth` is re-exported from `@ghentcdh/crouton-vue`. Auth turns on automatically when `GET /_app/auth` returns providers.

```ts
import { useAuth } from '@ghentcdh/crouton-vue';

const { user, isAuthenticated, login, logout, hasRole } = useAuth();
```

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /_app/auth` | Public: returns provider config (no secrets) |
| `GET /_app/me` | Returns current authenticated user |

## Custom provider

```ts
// auth-providers/ldap/index.ts
import { defineAuthProvider } from '@ghentcdh/crouton-auth';

export default defineAuthProvider({
  authenticate: async (req) => {
    // verify token from req.headers.authorization
    // return CroutonUser or null
  },
});
```
