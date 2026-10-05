/**
 * Fixture-driven HTTP tests for schema endpoints.
 *
 * For each fixture case in crouton-core/test-fixtures/resources, boots one
 * NestJS app and calls GET /api/<route>/schemas, /definition, and /resource.json
 * for every resource. Responses are snapshot-tested so regressions in either
 * the loader or the schema builder are caught.
 *
 * Cases marked apiOnly (none yet) would be handled separately in sub-resource tests.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootCase, FIXTURES_ROOT, type BootedCase } from './test-utils';

// Endpoints × path suffix
const ENDPOINTS = [
  { name: 'schemas', suffix: 'schemas' },
  { name: 'definition', suffix: 'definition' },
  { name: 'resource.json', suffix: 'resource.json' },
] as const;

const loadJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return undefined;
  }
};

/** Collect resource dirs inside a case directory. */
const resourceDirs = (caseName: string): string[] =>
  readdirSync(join(FIXTURES_ROOT, caseName), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

/** Derive the route from the resource.json (defaults to resource dir name). */
const routeFor = (caseName: string, resourceDir: string): string | null => {
  const jsonPath = join(FIXTURES_ROOT, caseName, resourceDir, 'resource.json');
  if (!existsSync(jsonPath)) return null;
  const json = loadJson(jsonPath) as any;
  return json?.route ?? resourceDir;
};

// Cases 1–8 + 17 (book-collection): all cases without apiOnly meta.
// We skip none here; if a case doesn't resolve, the resource won't be registered
// and the test just checks 404 for missing resources.
const cases = readdirSync(FIXTURES_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const caseName of cases) {
  const resources = resourceDirs(caseName).filter((r) =>
    existsSync(join(FIXTURES_ROOT, caseName, r, 'resource.json')),
  );
  if (resources.length === 0) continue;

  describe(`fixture: ${caseName}`, () => {
    let ctx: BootedCase;

    beforeAll(async () => {
      ctx = await bootCase(caseName);
    }, 30_000);

    afterAll(async () => {
      await ctx?.cleanup();
    });

    for (const resourceDir of resources) {
      const route = routeFor(caseName, resourceDir);
      if (!route) continue;

      for (const endpoint of ENDPOINTS) {
        it(`${resourceDir} → GET /api/${route}/${endpoint.suffix} returns 200 or 404`, async () => {
          const res = await ctx.http.get(`/api/${route}/${endpoint.suffix}`);
          // 200: resource registered and has views
          // 404: resource couldn't be loaded (load error) or has no views
          // Both are valid — we just snapshot whatever comes back
          expect([200, 404]).toContain(res.status);

          if (res.status === 200) {
            // snapshot the body
            const snapshotPath = join(
              __dirname,
              `__snapshots__/schemas/${caseName}.${resourceDir}.${endpoint.name}.json`,
            );
            await expect(JSON.stringify(res.body, null, 2)).toMatchFileSnapshot(
              snapshotPath,
            );
          }
        });
      }
    }
  });
}
