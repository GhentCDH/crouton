# Disable Browser Cache Plan

## Problem

API responses are being cached / revalidated by the browser:

- **ETag** — `crouton-api` is a NestJS app on Express. Express sets a weak
  `ETag` on responses by default (`etag: 'weak'`). Chrome caches it and replays
  it as `If-None-Match` on the next request; the server answers `304 Not
  Modified`, so the client keeps stale data.
- **No `Cache-Control`** — nothing in `crouton-api` sets a cache policy, so the
  browser applies its own heuristic freshness on top of the ETag behaviour.

There is no explicit cache/ETag config anywhere in the codebase today. The only
response headers set are `Vary` / `Content-Language` in
`src/lib/crud/translation/language.interceptor.ts`.

## Goal

Every crouton-served response tells the browser not to cache it, and no
conditional-request 304s occur — without requiring each consumer app to wire it
up by hand.

## Approach — library-level interceptor (recommended)

Fix it once in `crouton-api` so all consumers inherit it. Mirror the existing
`LanguageInterceptor` pattern, but register it **unconditionally** (the language
one is only registered when i18n is configured).

### 1. Add `NoCacheInterceptor`

`packages/crouton-api/src/lib/crud/no-cache.interceptor.ts`

```ts
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    return next.handle();
  }
}
```

### 2. Register it in the module

In `packages/crouton-api/src/lib/crouton-api.module.ts`, add to the `providers`
array in `forResources` (always on, not gated like the translation providers):

```ts
{ provide: APP_INTERCEPTOR, useClass: NoCacheInterceptor },
```

`APP_INTERCEPTOR` is already imported. This makes the header apply to every
route the module serves (CRUD controllers, status, app-layout, dev-tools).

### Why this is enough

`no-store` forbids the browser from keeping a copy, so it has nothing to
revalidate — no `If-None-Match`, no 304. Express can still compute its ETag; it
becomes irrelevant because the client never stores the response. No bootstrap
change needed.

## Optional hardening — also kill ETag generation

If you'd rather Express not emit ETags at all, disable it at bootstrap. This is
a per-app change (the library can't reach the Express instance cleanly), so it
must go in each `main.ts` **and** the scaffold templates:

- `examples/book-collection/apps/backend/src/main.ts`
- `packages/create-crouton/templates/nx/workspace/apps/backend/src/main.ts.tmpl`
- `packages/create-crouton/templates/regular/src/main.ts.tmpl`

```ts
const app = await NestFactory.create(AppModule);
app.getHttpAdapter().getInstance().set('etag', false); // add this
app.enableCors();
```

Given the interceptor already prevents caching, this is optional cleanup, not
required for correctness.

## Make it configurable (optional)

If some apps legitimately want caching, gate the interceptor behind
`CroutonAppConfig` (e.g. `cache?: false` to disable, default = no-store) and
only push the `APP_INTERCEPTOR` provider when caching is off. Keeps the safe
default while allowing opt-in caching later.

## Dev-only workaround (no code)

For a one-off during development: Chrome DevTools -> Network -> "Disable cache"
(active only while DevTools is open).

## Files touched (recommended path)

- `packages/crouton-api/src/lib/crud/no-cache.interceptor.ts` (new)
- `packages/crouton-api/src/lib/crouton-api.module.ts` (register provider)

## Verification

1. `pnpm nx build crouton-api` (or the affected target).
2. Run a consumer (e.g. book-collection backend), hit a GET endpoint twice.
3. Confirm the response carries `Cache-Control: no-cache, no-store,
   must-revalidate` and the second request is `200`, not `304`.
4. Add a small unit spec next to the interceptor asserting `setHeader` is called
   with the expected value (matches the repo's `*.spec.ts` convention).
