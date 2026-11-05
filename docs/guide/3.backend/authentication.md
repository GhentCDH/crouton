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
| `microsoft` | `MICROSOFT_CLIENT_ID` | OIDC via `login.microsoftonline.com` |
| `oidc` | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE` | Generic OIDC |
| `dev` | `CROUTON_DEV_TOKEN` | Static bearer token — **refuses to start in production** |
| `custom` | — | `index.ts` default-exports `defineAuthProvider(...)` |

Env vars listed above are the defaults. Override with the `env` field in `auth-provider.json`.

These env vars enable **bearer-token validation** (protecting the API). To also enable the browser **OAuth2 login flow** for a provider, it additionally needs `<PROVIDER>_CLIENT_SECRET` and `<PROVIDER>_CALLBACK_URL` — e.g. `KEYCLOAK_CLIENT_SECRET` / `KEYCLOAK_CALLBACK_URL`, `AUTH0_...`, `GOOGLE_...`, `MICROSOFT_...`, `OIDC_...` (not applicable to `dev`/`custom`). When they are missing, only the bearer strategy is registered and the login/callback endpoints cannot authenticate.

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
// resource.json — named guards are AND-ed, so the user must hold every one
{ "security": { "guard": "admin" } }
{ "security": { "guard": ["editor", "reviewer"] } }
```

Inside `auth-provider.json`, a guard *definition* uses `anyOf` semantics: an array is shorthand for `anyOf`, and an object can combine `anyOf`/`allOf`:

```jsonc
// auth-provider.json
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

const { user, isAuthenticated, login, logout, hasRole, getToken } = useAuth();
```

`getToken()` returns the current access token (or `null`); the Crouton axios client attaches it as a `Bearer` header automatically.

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /_app/auth` | Public: returns provider config (no secrets) |
| `GET /_app/me` | Returns current authenticated user |
| `GET /_app/auth/:provider/login` | Starts the OAuth2 login flow (302 to the provider) |
| `GET /_app/auth/:provider/callback` | OAuth2 callback; redirects to `CROUTON_FRONTEND_URL` with `?access_token=...` |

`:provider` is the provider's directory name (its Passport strategy name), e.g. `keycloak`. The OAuth2 endpoints require the `<PROVIDER>_CLIENT_SECRET` / `<PROVIDER>_CALLBACK_URL` env vars.

## Token lifetime & refresh

**Access-token lifetime** is set entirely by the identity provider — Crouton does not configure it. Crouton's backend validates tokens by calling the IdP `userinfo` endpoint; an expired token returns unauthenticated.

The frontend (oidc-client-ts) renews the access token roughly 60 seconds before expiry via `automaticSilentRenew`. By default, renewal uses a hidden iframe (`signinSilent` with `prompt=none`) against the IdP SSO session. This breaks in modern browsers under third-party-cookie restrictions and cannot extend a session once the SSO session ends.

**Tokens are stored in `sessionStorage`** and cleared when the tab closes.

### Enabling refresh tokens

Add `offline_access` to `scopes` in `auth-provider.json` and enable offline access on the IdP client:

```jsonc
// auth-providers/keycloak/auth-provider.json
{
  "name": "keycloak",
  "provider": "keycloak",
  "scopes": ["openid", "profile", "email", "offline_access"]
}
```

When a refresh token is present, oidc-client-ts uses `grant_type=refresh_token` for silent renewal instead of the SSO iframe. On signout, the refresh token is revoked automatically.

**Provider support:**

| Provider | Notes |
|---|---|
| Keycloak | Enable "Offline Access" on the client; `offline_access` in scope ⇒ refresh token |
| Auth0 | Grant/config must allow `offline_access` |
| Microsoft | `offline_access` works with the OIDC endpoint |
| Google | Standard `offline_access` does not apply; uses `access_type=offline` + `prompt=consent` semantics — not supported |
| Generic `oidc` | Issuer-dependent |

::: warning XSS exposure
Refresh tokens are stored in `sessionStorage` alongside access tokens. The session-storage model is unchanged; httpOnly-cookie / BFF storage is out of scope but mitigates this risk.
:::

The `dev` token never expires and is not affected by these settings.

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
