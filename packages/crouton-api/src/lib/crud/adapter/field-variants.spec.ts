import { describe, expect, it } from 'vitest';

import { JsonColumnSchema } from '@ghentcdh/crouton-core';

import { resolveColumnFieldVariants } from './column-transforms';

describe('resolveColumnFieldVariants', () => {
  it('is a passthrough — columns returned as-is', () => {
    const cols = [
      JsonColumnSchema.parse({
        id: 'name',
        fieldInput: { type: 'text', options: { colspan: 6 } },
      }),
    ];
    const out = resolveColumnFieldVariants(cols)!;
    expect(out).toBe(cols);
  });

  it('is a no-op passthrough for undefined', () => {
    expect(resolveColumnFieldVariants(undefined)).toBeUndefined();
  });
});
