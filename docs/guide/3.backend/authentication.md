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
| `google` | `GOOGLE_CLIENT_ID` | Checks `aud` = client id. Roles via `roles.byEmail` |
| `microsoft` | `MICROSOFT_CLIENT_ID` (+ optional `MICROSOFT_TENANT`, default `common`) | Checks `aud` = client id. `common`/`organizations`/`consumers` accept any tenant whose `iss` matches the token's `tid`; a tenant id/domain pins the issuer. App roles via the `roles` claim |
| `oidc` | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE` | Generic OIDC |
| `dev` | `CROUTON_DEV_TOKEN` | Static bearer token — **refuses to start in production** |
| `custom` | — | `index.ts` default-exports `defineAuthProvider(...)` |

Env vars listed above are the defaults. Override with the `env` field in `auth-provider.json`.

These env vars enable **bearer-token validation** (protecting the API). Without anything else, the frontend logs in **in the browser** (OIDC + PKCE against the provider) and sends the provider's access token.

### Server-side login (required for Google and Microsoft)

Set `<PROVIDER>_CLIENT_SECRET` and `<PROVIDER>_CALLBACK_URL` — e.g. `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`, `MICROSOFT_...`, `KEYCLOAK_...`, `AUTH0_...`, `OIDC_...` (not applicable to `dev`/`custom`) — and the provider switches to **server-side login**:

1. The frontend navigates to `GET /_app/auth/<provider>/login` → 302 to the provider.
2. The provider redirects to `<PROVIDER>_CALLBACK_URL` (`…/_app/auth/<provider>/callback`). The backend verifies the returned ID/access token with the same checks as bearer validation (issuer, audience, `allowedDomains`) and maps roles.
3. The backend signs a **crouton session JWT** and redirects to `${CROUTON_FRONTEND_URL}/auth/callback#token=…` (URL fragment — never sent to servers or logs). On failure: `#error=access_denied`, shown on the login screen.
4. The frontend stores the session token in `localStorage` and sends it as `Bearer` on every request.

| Env var | Default | Notes |
|---|---|---|
| `CROUTON_AUTH_SECRET` | — | HMAC secret for session JWTs. **Required** as soon as any provider has server-side login configured — the backend refuses to start without it. Use a long random value. |
| `CROUTON_SESSION_TTL` | `8h` | Session lifetime (e.g. `30m`, `8h`, `7d`). After expiry the user logs in again. |
| `CROUTON_FRONTEND_URL` | `''` | Frontend origin the callback redirects to, e.g. `http://localhost:4200`. |

Roles are baked into the session token at login: role changes (e.g. editing `roles.byEmail`) apply after the next login.

::: warning Not yet supported
The OAuth2 `state` parameter (login CSRF protection) is not sent yet.
:::

### Restricting who can sign in

With Google or Microsoft, *any* account can authenticate. Restrict sign-in to your organisation with `roles.allowedDomains` (enforced on every token, bearer and login):

```jsonc
// auth-providers/google/auth-provider.json
{
  "name": "Google",
  "provider": "google",
  "roles": {
    "allowedDomains": ["ugent.be"],
    "byEmail": { "admin": ["alice@ugent.be"] }
  }
}
```

Tokens whose `email` domain is not listed, or whose `email_verified` is `false`, are rejected. `roles.byEmail` works for every provider whose token carries an `email` claim.

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

const { user, isAuthenticated, login, loginWith, logout, hasRole, getToken, providers, app } = useAuth();
```

`getToken()` returns the session token (server-side login) or the OIDC access token (browser login), or `null`; the Crouton axios client attaches it as a `Bearer` header automatically.

**One provider** → an unauthenticated visit redirects straight to it. **Several providers** → the `CroutonPlugin` (with a `router`) shows a login screen at `/auth/login`: the app logo and title, and one button per provider (Google and Microsoft get their icons). `loginWith(provider)` starts the login for one of `providers`.

### Logo

```json
// crouton.json
{ "title": "My app", "logo": "/logo.svg" }
```

`logo` is a URL served by the frontend (e.g. a file in `public/`). It is shown on the login screen, returned by `GET /_app/layout` (`useCrouton().logo`) and accepted by `ShellComponent` as the `logo` prop.

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /_app/auth` | Public: returns provider config (no secrets) — per provider `id`, `name`, `loginMode` (`server`/`browser`) — and `app` (`title`, `logo`) |
| `GET /_app/me` | Returns current authenticated user |
| `GET /_app/auth/:provider/login` | Starts the OAuth2 login flow (302 to the provider) |
| `GET /_app/auth/:provider/callback` | OAuth2 callback; redirects to `${CROUTON_FRONTEND_URL}/auth/callback#token=<session JWT>` (or `#error=access_denied`) |

`:provider` is the provider's directory name (its Passport strategy name), e.g. `keycloak`. The OAuth2 endpoints require the `<PROVIDER>_CLIENT_SECRET` / `<PROVIDER>_CALLBACK_URL` env vars.

## Token lifetime & refresh

**Access-token lifetime** (browser login) is set entirely by the identity provider — Crouton does not configure it. Crouton's backend verifies tokens locally against the IdP's JWKS (signature, issuer, expiry, audience where configured); an expired token returns unauthenticated. Server-side logins use the crouton session lifetime (`CROUTON_SESSION_TTL`) instead — there is no silent renewal; the user logs in again after expiry.

The frontend (oidc-client-ts) renews the access token roughly 60 seconds before expiry via `automaticSilentRenew`. By default, renewal uses a hidden iframe (`signinSilent` with `prompt=none`) against the IdP SSO session. This breaks in modern browsers under third-party-cookie restrictions and cannot extend a session once the SSO session ends.

**Tokens are stored in `localStorage`** (OIDC user under the oidc-client-ts key, session JWT under `crouton.session`) so a session survives reloads and new tabs.

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
Refresh tokens and session tokens are stored in `localStorage`, readable by any script on the page. httpOnly-cookie / BFF storage is out of scope but mitigates this risk.
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
