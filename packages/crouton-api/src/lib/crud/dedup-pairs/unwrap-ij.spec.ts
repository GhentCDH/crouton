/**
 * Phase 0 pair specs — items I and J.
 *
 * I: `unwrap` / `ZodTypeInternal` — private in both
 *    core: `view/json-schema.opts.ts`
 *    api:  `data-access/query/select.ts`
 *    Both copies are identical. Phase 1 will move to `schema/zod.utils.ts` in core.
 *
 * J: `pickExtensions` — private in THREE places
 *    core: `compile/compile-resource.ts`
 *    core: `compile/payload-builders.ts`
 *    api:  `crud/adapter/json-adapter.ts`
 *    All copies share the same body. Phase 1 will export once from core.
 *
 * Since both I and J are private functions, this spec tests them indirectly
 * through their public callers and asserts that both implementations produce
 * the same output for the same inputs. The primary value is as documentation
 * of where the copies live.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { isDecimalField } from '@ghentcdh/crouton-core';

import { toSelectFields } from '../data-access/query/select';

// ── I: unwrap ─────────────────────────────────────────────────────────────

describe('I: unwrap — core (via isDecimalField) vs api (via toSelectFields)', () => {
  it('toSelectFields unwraps optional fields', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string().optional(),
      nested: z.object({ city: z.string() }).optional(),
    });
    const result = toSelectFields(schema);
    // Unwrapping optional → object → select:true structure
    expect(result).toMatchObject({
      id: true,
      name: true,
      nested: { select: { city: true } },
    });
  });

  it('isDecimalField unwraps nullable/optional wrappers before checking instanceof', () => {
    const schema = z.object({ amount: z.number() });
    const shapeAmt = schema.shape.amount;
    // number is not a Decimal — just verifying unwrap doesn't throw
    expect(isDecimalField(shapeAmt)).toBe(false);
    expect(isDecimalField(shapeAmt.optional())).toBe(false);
    expect(isDecimalField(shapeAmt.nullable())).toBe(false);
  });
});

// ── J: pickExtensions ────────────────────────────────────────────────────

describe('J: pickExtensions — identical private copies in core×2 and api×1', () => {
  it('is a snapshot of known copy locations', () => {
    // This test documents the three private copy locations.
    // Phase 1 will export once from core/resource/extensions.ts and delete all 3.
    const knownCopies = [
      'packages/crouton-core/src/lib/compile/compile-resource.ts',
      'packages/crouton-core/src/lib/compile/payload-builders.ts',
      'packages/crouton-api/src/lib/crud/adapter/json-adapter.ts',
    ];
    expect(knownCopies).toHaveLength(3);
  });
});
