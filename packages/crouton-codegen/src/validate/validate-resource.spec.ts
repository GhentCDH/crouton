import { beforeAll, describe, expect, it } from 'vitest';

import { validateResourceFile } from './validate-resource';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';



let tmpDir: string;

const validResource = {
  $schema: 'https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json',
  schemaVersion: 1,
  name: 'book',
  model: 'Book',
  columns: {
    id: { idField: true, hiddenInForm: true },
    title: { searchable: true },
  },
};

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'crouton-validate-'));
});

describe('validateResourceFile', () => {
  it('returns 0 issues for a valid resource', async () => {
    const file = join(tmpDir, 'valid.json');
    await writeFile(file, JSON.stringify(validResource));
    const issues = await validateResourceFile(file);
    expect(issues).toHaveLength(0);
  });

  it('returns a JSON_PARSE_ERROR for malformed JSON', async () => {
    const file = join(tmpDir, 'broken.json');
    await writeFile(file, '{ "name": "book", ');
    const issues = await validateResourceFile(file);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('JSON_PARSE_ERROR');
  });

  it('returns an issue with "Did you mean autocomplete?" for a typo in fieldInput.type', async () => {
    const typoResource = {
      name: 'book',
      model: 'Book',
      columns: {
        authorId: {
          fieldInput: {
            type: 'autocompleet',
            relationType: 'manyToOne',
            resource: './author.resource',
          },
        },
      },
    };
    const file = join(tmpDir, 'typo.json');
    await writeFile(file, JSON.stringify(typoResource));
    const issues = await validateResourceFile(file);
    expect(issues.length).toBeGreaterThan(0);
    const withHint = issues.find((i) => i.hint?.includes('autocomplete'));
    expect(withHint).toBeDefined();
  });
});
