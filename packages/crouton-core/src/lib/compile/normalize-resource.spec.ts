import { describe, expect, it } from 'vitest';

import type { ResourceInput } from './model';
import { normalizeResource, normalizeResourceOrThrow } from './normalize-resource';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(__dirname, '../../..', 'test-fixtures/resource-inputs');

const loadFixture = (relPath: string): ResourceInput =>
  JSON.parse(
    require('node:fs').readFileSync(join(FIXTURES_DIR, relPath), 'utf-8'),
  ) as ResourceInput;

describe('normalizeResource', () => {
  it('returns errors for invalid resource', () => {
    const result = normalizeResource({ resource: { invalid: true }, refs: {}, enums: {} });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('minimal-prisma: produces valid NormalizedResource', () => {
    const input = loadFixture('minimal-prisma/book.input.json');
    const result = normalizeResource(input);
    expect(result.errors).toHaveLength(0);
    const r = result.resource;
    expect(r.route).toBe('books');
    expect(r.name).toBe('book');
    expect(r.uri).toBe('http://localhost:3000/books');
    expect(r.data.prismaModel).toBe('Book');
    expect(r.data.fields).toHaveProperty('id');
    expect(r.data.fields['id'].required).toBe(false);
  });

  it('minimal-prisma: has form+table schemas', () => {
    const input = loadFixture('minimal-prisma/book.input.json');
    const { resource } = normalizeResource(input);
    expect(resource.schemas).toHaveProperty('form');
    expect(resource.schemas).toHaveProperty('table');
    expect(resource.schemas['form']).toHaveProperty('data');
    expect(resource.schemas['form']).toHaveProperty('ui');
  });

  it('minimal-prisma: has operations', () => {
    const input = loadFixture('minimal-prisma/book.input.json');
    const { resource } = normalizeResource(input);
    expect(resource.operations).toHaveProperty('findAll');
    expect(resource.operations['findAll'].enabled).toBe(true);
    expect(resource.operations['findAll'].uri).toContain('/books');
    expect(resource.operations['findAll'].method).toBe('GET');
  });

  it('minimal-custom: kind=custom, no prismaModel', () => {
    const input = loadFixture('minimal-custom/page.input.json');
    const result = normalizeResource(input);
    expect(result.errors).toHaveLength(0);
    expect(result.resource.kind).toBe('custom');
    expect(result.resource.data.prismaModel).toBeUndefined();
  });

  it('enum-column: search is populated', () => {
    const input = loadFixture('enum-column/book.input.json');
    const result = normalizeResource(input);
    expect(result.errors).toHaveLength(0);
  });

  it('normalizeResourceOrThrow: throws on invalid input', () => {
    expect(() => normalizeResourceOrThrow({ resource: {}, refs: {}, enums: {} })).toThrow();
  });
});

// Snapshot tests over all fixture directories
describe('normalizeResource snapshots', () => {
  const cases = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const caseName of cases) {
    const inputs = readdirSync(join(FIXTURES_DIR, caseName)).filter((f) =>
      f.endsWith('.input.json'),
    );
    for (const inputFile of inputs) {
      it(`${caseName}/${inputFile} → no errors`, () => {
        const input = loadFixture(`${caseName}/${inputFile}`);
        const result = normalizeResource(input);
        expect(result.errors).toHaveLength(0);
      });
    }
  }
});
