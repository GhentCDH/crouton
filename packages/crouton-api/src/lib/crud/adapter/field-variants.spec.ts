import { describe, expect, it } from 'vitest';

import { JsonColumnSchema } from '@ghentcdh/crouton-core';

import { resolveColumnFieldVariants } from './column-transforms';

describe('resolveColumnFieldVariants', () => {
  it('no variants → fieldView deep-equals fieldInput', () => {
    const cols = [
      JsonColumnSchema.parse({
        id: 'name',
        fieldInput: { type: 'text', options: { colspan: 6 } },
      }),
    ];
    const out = resolveColumnFieldVariants(cols)!;
    expect(out[0].fieldView).toEqual(out[0].fieldInput);
    // fieldTable removed: table type overrides now come from layout.table.controls
    expect((out[0] as any).fieldTable).toBeUndefined();
  });

  it('relation column fieldView inherits enriched base options', () => {
    const cols = [
      JsonColumnSchema.parse({
        id: 'author',
        fieldInput: {
          format: 'relation',
          resource: '../author/resource.json',
          // mimics options injected by URI enrichment before resolve runs
          options: { uri: 'http://x/author', displayKey: 'name' },
        },
      }),
    ];
    const out = resolveColumnFieldVariants(cols)!;
    // fieldView inherits the enriched uri
    expect((out[0].fieldView?.options as Record<string, unknown>).uri).toBe(
      'http://x/author',
    );
  });

  it('is a no-op passthrough for undefined', () => {
    expect(resolveColumnFieldVariants(undefined)).toBeUndefined();
  });
});
