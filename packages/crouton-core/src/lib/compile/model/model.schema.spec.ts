/**
 * Phase 1: unit tests for ResourceInput and ModelSchema Zod contracts.
 *
 * Validates the contracts are correct before any pipeline implementation.
 * Also validates the captured ResourceInput JSON fixtures (phase 1 fixtures)
 * parse successfully — these are the inputs used by Phase 3 pipeline tests.
 */

import { describe, expect, it } from 'vitest';

import { ResourceInputSchema } from './model.schema';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FIXTURES_ROOT = resolve(
  __dirname,
  '../../../../test-fixtures/resource-inputs',
);

describe('ResourceInputSchema', () => {
  it('parses a minimal resource input', () => {
    const result = ResourceInputSchema.safeParse({
      resource: { name: 'book', route: 'books', columns: {} },
      enums: {},
      refs: {},
    });
    expect(result.success).toBe(true);
  });

  it('parses with a model', () => {
    const result = ResourceInputSchema.safeParse({
      resource: { name: 'book', route: 'books', columns: {} },
      model: {
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['title'],
      },
      enums: {},
      refs: {},
      baseUrl: 'http://localhost:3000',
    });
    expect(result.success).toBe(true);
  });

  it('parses with refs', () => {
    const result = ResourceInputSchema.safeParse({
      resource: { name: 'loan', route: 'loans', columns: {} },
      enums: {},
      refs: {
        books: {
          resource: { name: 'book', route: 'books', columns: {} },
        },
        authors: {
          resource: { name: 'author', route: 'authors', columns: {} },
          model: {
            properties: { id: { type: 'string' }, name: { type: 'string' } },
            required: ['name'],
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('defaults enums to empty object', () => {
    const result = ResourceInputSchema.parse({
      resource: {},
      refs: {},
      enums: {},
    });
    expect(result.enums).toEqual({});
    expect(result.refs).toEqual({});
  });
});

describe('ResourceInputSchema — fixture files', () => {
  let caseDirs: string[];
  try {
    caseDirs = readdirSync(FIXTURES_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    caseDirs = [];
  }

  for (const caseName of caseDirs) {
    const caseDir = join(FIXTURES_ROOT, caseName);
    let inputFiles: string[];
    try {
      inputFiles = readdirSync(caseDir).filter((f) => f.endsWith('.input.json'));
    } catch {
      inputFiles = [];
    }

    for (const file of inputFiles) {
      it(`${caseName}/${file} parses as ResourceInput`, () => {
        const raw = JSON.parse(readFileSync(join(caseDir, file), 'utf-8'));
        const result = ResourceInputSchema.safeParse(raw);
        expect(result.success, result.error?.message).toBe(true);
      });
    }
  }
});
