import { describe, expect, it } from 'vitest';

import { JsonColumnSchema } from '@ghentcdh/crouton-core';

import { resolveColumnFieldVariants } from './column-transforms';

describe('resolveColumnFieldVariants', () => {
  it('no variants → fieldView/fieldTable deep-equal fieldInput', () => {
    const cols = [
      JsonColumnSchema.parse({
        id: 'name',
        fieldInput: { type: 'text', options: { colspan: 6 } },
      }),
    ];
    const out = resolveColumnFieldVariants(cols)!;
    expect(out[0].fieldView).toEqual(out[0].fieldInput);
    expect(out[0].fieldTable).toEqual(out[0].fieldInput);
  });

  it('relation column with fieldTable override inherits enriched base options plus override', () => {
    const cols = [
      JsonColumnSchema.parse({
        id: 'author',
        fieldInput: {
          format: 'relation',
          resource: '../author/resource.json',
          // mimics options injected by URI enrichment before resolve runs
          options: { uri: 'http://x/author', displayKey: 'name' },
        },
        fieldTable: { options: { display: 'chip' } },
      }),
    ];
    const out = resolveColumnFieldVariants(cols)!;
    // fieldView inherits the enriched uri
    expect((out[0].fieldView?.options as Record<string, unknown>).uri).toBe(
      'http://x/author',
    );
    // fieldTable inherits uri + displayKey and adds its own display
    expect(out[0].fieldTable?.options).toMatchObject({
      uri: 'http://x/author',
      displayKey: 'name',
      display: 'chip',
    });
  });

  it('is a no-op passthrough for undefined', () => {
    expect(resolveColumnFieldVariants(undefined)).toBeUndefined();
  });
});
