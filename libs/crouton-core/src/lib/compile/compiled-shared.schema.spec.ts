import { describe, expect, it } from 'vitest';

import { CompiledResourceSchema } from './compiled-resource.schema';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';

/**
 * Regression guards for the compiled-field vocabulary shared by the resource
 * and sub-resource schemas. If either side stops using the shared schemas (or
 * grows its own enum), these fail.
 */
describe('compiled shared schemas', () => {
  describe('sub-resource fields', () => {
    const shape = CompiledSubResourceConfigSchema.shape;

    it('childKind uses the resource-kind vocabulary', () => {
      expect(shape.childKind.safeParse('prisma').success).toBe(true);
      expect(shape.childKind.safeParse('custom').success).toBe(true);
      expect(shape.childKind.safeParse('bogus').success).toBe(false);
    });

    it('relationType uses the relation-type vocabulary', () => {
      for (const value of ['oneToOne', 'manyToOne', 'oneToMany', 'manyToMany']) {
        expect(shape.relationType.safeParse(value).success).toBe(true);
      }
      expect(shape.relationType.safeParse('hasMany').success).toBe(false);
    });

    it('shares the idType vocabulary with the resource schema', () => {
      expect(shape.idType.safeParse('number').success).toBe(true);
    });

    it('does not carry the derived modalSize (computed in payload builders)', () => {
      expect('modalSize' in shape).toBe(false);
    });
  });

  describe('resource fields', () => {
    const shape = CompiledResourceSchema.shape;

    it('idType accepts the shared values', () => {
      expect(shape.idType.safeParse('number').success).toBe(true);
    });

    it('views accepts an empty view map', () => {
      expect(shape.views.safeParse({}).success).toBe(true);
    });

    it('does not carry the derived modalSize (computed in payload builders)', () => {
      expect('modalSize' in shape).toBe(false);
    });
  });
});
