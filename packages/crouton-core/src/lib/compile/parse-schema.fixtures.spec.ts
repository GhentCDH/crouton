
import { afterEach, describe, expect, it } from 'vitest';

import type { EnumRegistry } from './enum-registry';
import { EnumRegistrySchema } from './enum-registry';
import type { ParseSchemaView } from './parse-schema';
import { parseSchema } from './parse-schema';
import { clearResourceExtensions } from '../resource';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FIXTURES_ROOT = resolve(__dirname, '../../../test-fixtures/resources');
const VIEWS: ParseSchemaView[] = ['schemas', 'definition', 'resource.json'];

// Load all case dirs
const cases = readdirSync(FIXTURES_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const loadJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return undefined;
  }
};

const loadEnums = (caseDir: string): EnumRegistry => {
  const raw = loadJson(join(caseDir, 'crouton.enums.json'));
  return raw ? EnumRegistrySchema.parse(raw) : {};
};

const loadResources = (caseDir: string): { resource: string; json: unknown }[] => {
  return readdirSync(caseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const jsonPath = join(caseDir, d.name, 'resource.json');
      return { resource: d.name, json: loadJson(jsonPath) };
    })
    .filter((r) => r.json !== undefined);
};

afterEach(() => clearResourceExtensions());

for (const caseName of cases) {
  const caseDir = join(FIXTURES_ROOT, caseName);
  const enums = loadEnums(caseDir);
  const resources = loadResources(caseDir);

  describe(`fixture: ${caseName}`, () => {
    for (const { resource, json } of resources) {
      for (const view of VIEWS) {
        it(`${resource} / ${view}`, async () => {
          let result: Record<string, unknown> | undefined;
          try {
            result = parseSchema(
              { json, enums },
              { baseUrl: 'http://localhost:3000' },
              view,
            );
          } catch (e) {
            // Some combinations may legitimately error (e.g. prisma without schema for certain ops).
            // Snapshot the error message so regressions are caught.
            result = { __error: (e as Error).message };
          }

          const snapshotPath = resolve(
            __dirname,
            `__snapshots__/parse-schema/${caseName}.${resource}.${view}.json`,
          );
          await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(snapshotPath);
        });
      }
    }
  });
}
