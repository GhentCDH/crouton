import { describe, expect, it } from 'vitest';

import { EnumRegistrySchema } from '../../compile/enum-registry';
import { parseSchema } from '../../compile/parse-schema';
import { runCodemods } from './codemods';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FIXTURES_ROOT = resolve(__dirname, '../../../../test-fixtures/resources');

/** Every resource.json under a fixture case (nested sub-resources included). */
const resourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const path = join(dir, d.name, 'resource.json');
      return [...(existsSync(path) ? [path] : []), ...resourceFiles(join(dir, d.name))];
    });

/**
 * The compiled column list echoes each column's `fieldInput`. After the relation lift,
 * `relationType`/`foreignKey`/`relation` live in `column.relation` (which every reader
 * prefers), so drop the legacy echo before comparing.
 */
const LEGACY_RELATION_ECHO = ['relationType', 'foreignKey', 'relation'];
const withoutRelationEcho = (v: unknown): unknown =>
  JSON.parse(JSON.stringify(v), (key, val: unknown) =>
    key === 'fieldInput' && val && typeof val === 'object'
      ? Object.fromEntries(Object.entries(val).filter(([k]) => !LEGACY_RELATION_ECHO.includes(k)))
      : val,
  );

const compile = (json: unknown, enums: unknown) =>
  withoutRelationEcho(parseSchema({ json, enums: EnumRegistrySchema.parse(enums ?? {}) }, { baseUrl: 'http://localhost:3000' }, 'schemas'));

describe('codemods keep the compiled result the same', () => {
  for (const caseName of readdirSync(FIXTURES_ROOT)) {
    const caseDir = join(FIXTURES_ROOT, caseName);
    const enumsPath = join(caseDir, 'crouton.enums.json');
    const enums: unknown = existsSync(enumsPath) ? JSON.parse(readFileSync(enumsPath, 'utf-8')) : undefined;
    for (const file of resourceFiles(caseDir)) {
      it(`${caseName}: ${file.slice(caseDir.length + 1)}`, () => {
        const raw = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>;
        expect(compile(runCodemods(raw).raw, enums)).toEqual(compile(raw, enums));
      });
    }
  }
});
